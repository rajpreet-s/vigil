import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { logger } from "../shared/index.js";
import { initAgent, runIncidentAnalysis, graph } from "./graph.js";
import { verifySlackSignature } from "./slack/client.js";

// ─── Environment ──────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PORT = process.env.AGENT_PORT ? parseInt(process.env.AGENT_PORT, 10) : 3001;
const HOST = process.env.HOST ?? "0.0.0.0";

const serverLogger = logger.child({ context: "agent-server" });

// ─── HTTP server ──────────────────────────────────────────────────────────────
// Intentionally minimal — no framework dependency needed for these routes.
// Contract:
//   GET  /health                  →  200 OK
//   POST /analyze/:incidentId     →  202 Accepted  (graph runs async)
//   POST /slack/interactions      →  200 OK (ACK) + async graph resume

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

    // ── POST /slack/interactions ──────────────────────────────────────────────
    // Slack sends a URL-encoded POST body with a `payload` field (JSON string)
    // whenever a user clicks a Block Kit action button.
    //
    // Critical constraint: Slack expects an HTTP 200 within 3 seconds.
    // We ACK immediately, then resume the graph asynchronously.
    if (method === "POST" && url === "/slack/interactions") {
        handleSlackInteraction(req, res);
        return;
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

// ─── handleSlackInteraction ───────────────────────────────────────────────────
//
// Handles POST /slack/interactions — the webhook Slack fires when an engineer
// clicks an Approve or Dismiss button in the on-call DM sent by human_review_node.
//
// Flow:
//   1. Buffer raw body  — HMAC must be computed on the exact raw bytes BEFORE
//                         any URL-decoding or JSON parsing.
//   2. Replay guard     — reject if X-Slack-Request-Timestamp is > 5 min old.
//   3. Verify signature — HMAC-SHA256 comparison via verifySlackSignature().
//   4. ACK Slack        — 200 empty response MUST be sent within 3 seconds.
//                         We do this before resuming the graph.
//   5. Parse payload    — URL-decode body → extract `payload` → JSON.parse.
//   6. Extract decision — action.value ('approved'|'dismissed'),
//                         incidentId from action_id ('approve:<uuid>' / 'dismiss:<uuid>').
//   7. Resume graph     — fire-and-forget graph.invoke() injects humanDecision
//                         into state, restarting human_review_node at Phase 2.

async function handleSlackInteraction(
    req: http.IncomingMessage,
    res: http.ServerResponse
): Promise<void> {
    // ── 1. Buffer raw body ────────────────────────────────────────────────────
    // We MUST read the full body before doing anything else.
    // Any transformation (url-decode, JSON parse) would invalidate the HMAC.
    const rawBody = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });

    // ── 2 & 3. Replay guard + signature verification ──────────────────────────
    const timestamp = req.headers["x-slack-request-timestamp"];
    const signature = req.headers["x-slack-signature"];

    if (typeof timestamp !== "string" || typeof signature !== "string") {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing Slack signature headers" }));
        return;
    }

    let isValid: boolean;
    try {
        isValid = verifySlackSignature(rawBody, timestamp, signature);
    } catch (err) {
        // verifySlackSignature throws if SLACK_SIGNING_SECRET is missing —
        // that is a server misconfiguration, log as error.
        serverLogger.error({ err }, "/slack/interactions: signature verification threw");
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
        return;
    }

    if (!isValid) {
        serverLogger.warn({ timestamp }, "/slack/interactions: invalid or replayed signature — rejected");
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
    }

    // ── 4. ACK Slack immediately ──────────────────────────────────────────────
    // Slack requires a 200 within 3 seconds. We send it before any async work.
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({}));

    // ── 5. Parse payload ──────────────────────────────────────────────────────
    // Slack sends: body = "payload=<url-encoded-json>"
    let payload: Record<string, unknown>;
    try {
        const decoded = decodeURIComponent(rawBody.replace(/^payload=/, ""));
        payload = JSON.parse(decoded) as Record<string, unknown>;
    } catch (err) {
        serverLogger.error({ err }, "/slack/interactions: failed to parse Slack payload");
        return;
    }

    // ── 6. Extract decision + incidentId from action_id ───────────────────────
    // action_id convention: 'approve:<incidentId>' or 'dismiss:<incidentId>'
    const actions = payload.actions as Array<Record<string, string>> | undefined;
    const action = actions?.[0];

    if (!action) {
        serverLogger.warn({ payload }, "/slack/interactions: no actions in payload");
        return;
    }

    const actionId: string = action.action_id ?? "";
    const actionValue: string = action.value ?? "";

    // Validate action value is one of the expected decisions
    if (actionValue !== "approved" && actionValue !== "dismissed") {
        serverLogger.warn({ actionId, actionValue }, "/slack/interactions: unexpected action value");
        return;
    }

    // Extract incidentId from action_id: "approve:<uuid>" or "dismiss:<uuid>"
    const incidentIdMatch = actionId.match(/^(?:approve|dismiss):(.+)$/);
    if (!incidentIdMatch) {
        serverLogger.warn({ actionId }, "/slack/interactions: could not extract incidentId from action_id");
        return;
    }
    const incidentId = incidentIdMatch[1];
    const humanDecision = actionValue as "approved" | "dismissed";

    serverLogger.info({ incidentId, humanDecision }, "/slack/interactions: resuming graph with decision");

    // ── 7. Resume graph — fire and forget ────────────────────────────────────
    // graph.invoke() with the same thread_id resumes from the checkpointed state,
    // re-entering human_review_node at Phase 2 with humanDecision injected.
    graph
        .invoke(
            { humanDecision },
            { configurable: { thread_id: incidentId } }
        )
        .then(() => {
            serverLogger.info({ incidentId, humanDecision }, "Graph resumed and completed successfully");
        })
        .catch((err) => {
            serverLogger.error(
                { incidentId, humanDecision, err: err instanceof Error ? err.message : String(err) },
                "Graph resume failed after Slack interaction"
            );
        });
}

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
