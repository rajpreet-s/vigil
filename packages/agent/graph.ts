import { StateGraph, START, END } from "@langchain/langgraph";
import { initTopology } from "./startup.js";
import { logger } from "../shared/index.js";
import { AgentStateSchema } from "./agentStateSchema.js";
import { load_node } from "./nodes/load_node.js";

const graphLogger = logger.child({ context: "graph" });

// ─── Graph definition ─────────────────────────────────────────────────────────

const builder = new StateGraph(AgentStateSchema)
    .addNode("load", load_node)
    .addEdge(START, "load")
    .addEdge("load", END); // temporary — more nodes will be chained here

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

export async function runIncidentAnalysis(incidentId: string): Promise<void> {
    graphLogger.info({ incidentId }, "Starting incident analysis graph run");

    await graph.invoke(
        { incidentId },
        { configurable: { thread_id: incidentId } }
    );

    graphLogger.info({ incidentId }, "Incident analysis graph run complete");
}
