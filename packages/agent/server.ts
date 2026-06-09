import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { logger } from "../shared/index.js";
import { initAgent, runIncidentAnalysis } from "./graph.js";

// ─── Environment ──────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PORT = process.env.AGENT_PORT ? parseInt(process.env.AGENT_PORT, 10) : 3001;
const HOST = process.env.HOST ?? "0.0.0.0";

const serverLogger = logger.child({ context: "agent-server" });

// ─── HTTP server ──────────────────────────────────────────────────────────────
// Intentionally minimal — no framework dependency needed for a single route.
// The only contract this server has is:
//   POST /analyze/:incidentId  →  202 Accepted  (graph runs async)
//   GET  /health               →  200 OK

const server = http.createServer((req, res) => {
    const url = req.url ?? "";
    const method = req.method ?? "";

    // ── Health check ──────────────────────────────────────────────────────────
    if (method === "GET" && url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    // ── POST /analyze/:incidentId ─────────────────────────────────────────────
    const analyzeMatch = url.match(/^\/analyze\/([^/]+)$/);
    if (method === "POST" && analyzeMatch) {
        const incidentId = analyzeMatch[1];

        // Return 202 immediately — the graph runs entirely in the background.
        // The API does not need to wait for analysis to complete.
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "accepted", incidentId }));

        // Fire and forget — errors are logged internally by the graph.
        runIncidentAnalysis(incidentId).catch((err) => {
            serverLogger.error(
                { incidentId, err: err instanceof Error ? err.message : String(err) },
                "Graph run failed"
            );
        });

        return;
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

// ─── Boot sequence ────────────────────────────────────────────────────────────

async function start() {
    // 1. Initialise agent (parse topology, sync DB) before accepting requests.
    await initAgent();

    // 2. Start HTTP server.
    await new Promise<void>((resolve, reject) => {
        server.listen(PORT, HOST, resolve);
        server.once("error", reject);
    });

    serverLogger.info({ port: PORT, host: HOST }, "Agent HTTP server listening");
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string) {
    serverLogger.warn(`Received ${signal}. Shutting down agent server...`);

    const forceExit = setTimeout(() => {
        serverLogger.error("Graceful shutdown timed out. Forcing exit.");
        process.exit(1);
    }, 10_000);

    server.close(() => {
        clearTimeout(forceExit);
        serverLogger.info("Agent server shut down cleanly.");
        process.exit(0);
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err) => {
    serverLogger.error(err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
});
