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

// Maps each .md filename to its ChromaDB ID and metadata.
// Add a new entry here whenever a new runbook file is created.
const RUNBOOK_REGISTRY: Array<{
    file: string; // filename inside /runbooks
    chromaId: string; // stable ID, also stored in PostgreSQL runbooks.chroma_id
    title: string;
    serviceName?: string;
}> = [
    {
        file: "cpu-spike.md",
        chromaId: "runbook-cpu-spike",
        title: "High CPU Usage — Investigation Runbook",
    },
    {
        file: "db-connection-exhaustion.md",
        chromaId: "runbook-db-connection-exhaustion",
        title: "Database Connection Exhaustion — Investigation Runbook",
        serviceName: "postgresql",
    },
    {
        file: "memory-pressure.md",
        chromaId: "runbook-memory-pressure",
        title: "Memory Pressure — Investigation Runbook",
    },
];

function loadRunbooks(): RunbookDocument[] {
    return RUNBOOK_REGISTRY.map(({ file, chromaId, title, serviceName }) => {
        const filePath = path.join(RUNBOOKS_DIR, file);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Runbook file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, "utf-8");
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
