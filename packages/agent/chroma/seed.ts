/**
 * Verify ChromaDB connection and seed runbooks from the /runbooks directory.
 * Run once after `docker compose up` to confirm the setup is working:
 *
 *   npx ts-node packages/agent/chroma/seed.ts
 *
 * Safe to re-run — deletes and recreates the collection each time for a clean state.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { chroma } from "./client.js";
import { ingestRunbooks, queryRunbooks, RunbookDocument } from "./runbooks.js";
import { logger } from "../../shared/index.js";

import { fileURLToPath } from "url";

const seedLogger = logger.child({ context: "chroma:seed" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the /runbooks directory relative to the repo root.
// __dirname = packages/agent/chroma, so we walk up 3 levels.
const RUNBOOKS_DIR = path.resolve(__dirname, "../../../user-files/runbooks");

function loadRunbooks(): RunbookDocument[] {
    const files = fs.readdirSync(RUNBOOKS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    return mdFiles.map((file) => {
        const filePath = path.join(RUNBOOKS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");

        // 1. Deriving chromaId from the filename (replace underscores with dashes, remove extension)
        const nameWithoutExt = path.basename(file, ".md");
        const chromaId = `runbook-${nameWithoutExt.replace(/_/g, "-")}`;

        // 2. Extract title from the first Markdown heading '# '
        const titleMatch = content.match(/^#\s+(.+)$/m);
        let title = nameWithoutExt;
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace(/^(?:SRE\s+)?Runbook:\s*/i, "").trim();
        }

        // 3. Extract serviceName if there is exactly one known service under Topology Component
        let serviceName: string | undefined = undefined;
        const lineMatch = content.match(/^.*\*\*Topology Component:\*\*.*$/mi);
        if (lineMatch && lineMatch[0]) {
            const line = lineMatch[0];
            const knownServices = ["postgresql", "redis", "api_service", "nginx"];
            const matchedServices = knownServices.filter((svc) => {
                const regex = new RegExp(`\`${svc}\``, "i");
                return regex.test(line);
            });
            if (matchedServices.length === 1) {
                serviceName = matchedServices[0];
            }
        }

        return { chromaId, title, serviceName, content };
    });
}

async function seed() {
    // 1. Heartbeat — confirms the Docker service is reachable
    const heartbeat = await chroma.heartbeat();
    seedLogger.info({ heartbeat }, "ChromaDB reachable");

    // 2. Delete the collection if it already exists, then recreate it.
    //    This guarantees a clean slate — no stale documents from previous seeds
    //    (including any leftover test data from earlier runs) survive.
    const existing = await chroma.listCollections();
    if (existing.some((c) => c.name === "vigil-runbooks")) {
        await chroma.deleteCollection({ name: "vigil-runbooks" });
        seedLogger.info("Old collection deleted");
    }

    // 3. Load runbook files from disk and ingest into the fresh collection
    const runbooks = loadRunbooks();
    seedLogger.info(`Loaded ${runbooks.length} runbook files from ${RUNBOOKS_DIR}`);

    await ingestRunbooks(runbooks);
    seedLogger.info(`✅ ${runbooks.length} runbooks ingested`);
    runbooks.forEach((r) => seedLogger.info(`   - [${r.serviceName ?? "all"}] ${r.title}`));

    // 4. Test query — verify retrieval is working end-to-end
    const results = await queryRunbooks(
        "database is running out of connections, API is returning 500 errors",
        "postgresql",
    );

    const topTitle = (results.metadatas?.[0]?.[0] as { title: string })?.title;
    const topDistance = results.distances?.[0]?.[0];
    const topScore = topDistance != null ? (1 - topDistance).toFixed(3) : "N/A";

    seedLogger.info(`✅ Query test passed`);
    seedLogger.info(`   Top match  : ${topTitle}`);
    seedLogger.info(`   Similarity : ${topScore}  (target: > 0.75)`);
}

seed().catch((err) => {
    seedLogger.error(err instanceof Error ? err : new Error(String(err)), "ChromaDB seed failed");
    process.exit(1);
});
