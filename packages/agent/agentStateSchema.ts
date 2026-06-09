import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { Anomaly, DeployEvent, Runbook, Topology } from "@prisma/client";

export const AgentStateSchema = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (left: BaseMessage[], right: BaseMessage[]) => left.concat(right),
        default: () => [],
    }),

    // ─── Core identity ─────────────────────────────────────────────────────────
    // incidentId doubles as the LangGraph thread_id
    incidentId: Annotation<string>({
        reducer: (_left, right) => right,
        default: () => "",
    }),

    // ─── Raw detection data ────────────────────────────────────────────────────
    rawAnomalies: Annotation<Anomaly[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
    topology: Annotation<Topology[]>({
        reducer: (_left, right) => right,
        default: () => [],
    }),
    causalTimeline: Annotation<Anomaly[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
    rootCauseCandidate: Annotation<Anomaly | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    confidence: Annotation<"HIGH" | "MEDIUM" | "LOW" | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // ─── Deploy correlation ────────────────────────────────────────────────────
    recentDeployments: Annotation<DeployEvent[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
    deployCorrelation: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // ─── Runbook retrieval ─────────────────────────────────────────────────────
    runbooks: Annotation<Runbook[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),

    // ─── LLM analysis outputs ──────────────────────────────────────────────────
    investigationFindings: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    rcaSummary: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // ─── Human-in-the-loop ─────────────────────────────────────────────────────
    humanDecision: Annotation<"approved" | "dismissed" | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
});