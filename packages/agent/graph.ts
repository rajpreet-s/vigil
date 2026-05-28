import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { initTopology } from "./startup.js";
import { logger } from "../shared/index.js";
import { fileURLToPath } from "url";

const graphLogger = logger.child({ context: "graph" });

export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (left: BaseMessage[], right: BaseMessage[]) => left.concat(right),
        default: () => [],
    }),
    anomalies: Annotation<string[]>({
        reducer: (left: string[], right: string[]) => left.concat(right),
        default: () => [],
    }),
});

async function detectAnomalies(state: typeof AgentState.State) {
    graphLogger.info("Analyzing state for anomalies...");
    // Simulate detecting an anomaly
    return {
        anomalies: ["High CPU Usage Detected"],
    };
}

async function analyzeAnomalies(state: typeof AgentState.State) {
    if (state.anomalies.length > 0) {
        graphLogger.info(`Analyzing detected anomalies: ${state.anomalies.join(", ")}`);
    } else {
        graphLogger.info("No anomalies detected.");
    }
    return {};
}

function shouldAnalyze(state: typeof AgentState.State) {
    if (state.anomalies.length > 0) {
        return "analyze";
    }
    return END;
}

const builder = new StateGraph(AgentState)
    .addNode("detect", detectAnomalies)
    .addNode("analyze", analyzeAnomalies)

    .addEdge(START, "detect")

    .addConditionalEdges("detect", shouldAnalyze, {
        analyze: "analyze",
        [END]: END,
    })

    .addEdge("analyze", END);

export const graph = builder.compile();

export async function runAgent() {
    graphLogger.info("--- Starting Agent Initialization ---");
    const topology = await initTopology();
    graphLogger.info("--- Initialized. Starting Agent Run ---");

    // Pass topology to the components that need it, or it can be accessed
    // by your graph nodes if they are in the same closure, or if you pass it
    // in the state/configuration. For now, we just ensure it's loaded.
    const initialState = { messages: [], anomalies: [] };

    const result = await graph.invoke(initialState);
    graphLogger.info("--- Agent Run Complete ---");
    graphLogger.info({ result }, "Agent result payload");
}

// Execute the agent if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runAgent().catch((err) => {
        graphLogger.error(err instanceof Error ? err : new Error(String(err)));
    });
}
