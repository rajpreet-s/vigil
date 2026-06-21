import { StateGraph, START, END } from "@langchain/langgraph";
import { initTopology } from "./startup.js";
import { logger } from "../shared/index.js";
import { AgentStateSchema } from "./agentStateSchema.js";
import { load_node } from "./nodes/load_node.js";
import { AgentError } from "./errors.js";
import { prisma } from "./prisma.js";
import { IncidentStatus } from "@prisma/client";
import { correlate_node } from "./nodes/correlate_node.js";

const graphLogger = logger.child({ context: "graph" });

// ─── Graph definition ─────────────────────────────────────────────────────────

const builder = new StateGraph(AgentStateSchema)
    .addNode("load", load_node)
    .addNode("correlate", correlate_node)
    .addEdge(START, "load")
    .addEdge("load", "correlate")
    .addEdge("correlate", END);

export const graph = builder.compile();

// ─── Boot function ────────────────────────────────────────────────────────────
// Called ONCE when the agent container starts, before accepting any requests.
// Parses topology.yaml and upserts edges into the DB so every graph run can
// read topology rows directly from Postgres without re-parsing YAML.

export async function initAgent(): Promise<void> {
    graphLogger.info("Agent booting — initialising topology...");
    await initTopology();
    graphLogger.info("Agent ready.");
}

// ─── Per-incident trigger ─────────────────────────────────────────────────────
// Called by the HTTP server once per incident when the settle timer fires.
// Sets the LangGraph thread_id to the incidentId so checkpoints are namespaced
// per incident and the graph can be resumed if it crashes mid-run.
//
// Error handling contract:
//   AgentError  → known, typed node failure; log structured + mark DB as failed.
//                 Do NOT rethrow — the incident has been recorded.
//   Unknown err → unexpected crash (framework bug, OOM, …); rethrow so
//                 server.ts can log it at ERROR level as an unhandled exception.

export async function runIncidentAnalysis(incidentId: string): Promise<void> {
    graphLogger.info({ incidentId }, "Starting incident analysis graph run");

    try {
        await graph.invoke(
            { incidentId },
            { configurable: { thread_id: incidentId } }
        );

        graphLogger.info({ incidentId }, "Incident analysis graph run complete");
    } catch (err) {
        if (err instanceof AgentError) {
            // ── Known, typed node failure ──────────────────────────────────────
            // Log with full structured context so we know exactly which node
            // failed and why, then write the failed status to the incidents table
            // so the incident is not left in a permanently "pending" state.
            graphLogger.error(
                {
                    incidentId,
                    node: err.node,
                    message: err.message,
                    cause: err.cause instanceof Error
                        ? err.cause.message
                        : String(err.cause ?? ""),
                },
                "Graph run aborted: node threw AgentError"
            );

            await markIncidentFailed(incidentId, err.message);
        } else {
            // ── Unexpected crash ───────────────────────────────────────────────
            // Do not swallow — rethrow so server.ts .catch() surfaces it as an
            // unhandled exception with its own ERROR log entry.
            graphLogger.error(
                { incidentId, err },
                "Graph run crashed unexpectedly"
            );
            throw err;
        }
    }
}

// ─── markIncidentFailed ───────────────────────────────────────────────────────
// Writes failure status back to Postgres so the incident is never left
// silently pending. The `reason` is stored for dashboard / on-call visibility.

async function markIncidentFailed(
    incidentId: string,
    reason: string
): Promise<void> {
    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status: IncidentStatus.FAILED,
                failure_reason: reason,
            },
        });
    } catch (dbErr) {
        // If even the failure-write fails, log it — do not throw. The original
        // AgentError has already been logged above with full context.
        graphLogger.error(
            { incidentId, dbErr },
            "markIncidentFailed: could not write failure status to DB"
        );
    }
}

