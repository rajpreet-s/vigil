import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { Anomaly, DeployEvent, Runbook } from '@prisma/client';
import type { TopologyGraph } from '../shared/topology/types.js';

export const AgentStateSchema = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (left: BaseMessage[], right: BaseMessage[]) => left.concat(right),
        default: () => [],
    }),

    // ─── Core identity ─────────────────────────────────────────────────────────
    // incidentId doubles as the LangGraph thread_id
    incidentId: Annotation<string>({
        reducer: (_left, right) => right,
        default: () => '',
    }),

    // ─── Run status ────────────────────────────────────────────────────────────
    // Written by graph.ts on fatal AgentError so notify_node can send a
    // degraded Slack message instead of silently doing nothing.
    status: Annotation<'running' | 'complete' | 'failed'>({
        reducer: (_left, right) => right,
        default: () => 'running',
    }),
    failureReason: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // ─── Raw detection data ────────────────────────────────────────────────────
    rawAnomalies: Annotation<Anomaly[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
    // ─── Topology graph ────────────────────────────────────────────────────────
    // Populated by load_node. Typed as the queryable TopologyGraph interface
    // (not raw DB rows) so every downstream node can call isUpstreamOf(),
    // getBlastRadius(), getUpstream(), etc. directly without re-walking edges.
    topology: Annotation<TopologyGraph | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    causalTimeline: Annotation<Anomaly[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
    rootCauseCandidate: Annotation<Anomaly | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    confidence: Annotation<'HIGH' | 'MEDIUM' | 'LOW' | null>({
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

    // ChromaDB vector-search results from retrieval_node.
    // Distinct from the Prisma `runbooks` table mirror — these are the raw
    // semantic matches (content + metadata) that get injected into the LLM prompt.
    runbookChunks: Annotation<
        { content: string | null; metadata: Record<string, unknown> | null }[]
    >({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),

    // ─── LLM analysis outputs ──────────────────────────────────────────────────
    investigationFindings: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // ── Per-question Slack-ready answers produced by rca_node ─────────────────
    // The LLM writes these as Slack mrkdwn strings with service names, metrics,
    // and timestamps already woven in. human_review_node and notify_node drop
    // them verbatim into Block Kit sections — no TypeScript formatting needed.
    //
    // Q1: "N services degraded in cascade:\n• *redis* (`cache_hit_rate`) · 14:02 UTC → ..."
    q1WhatBroke: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    // Q2: "Root cause: *redis* — `cache_hit_rate` spiked at 14:02 UTC\n..."
    q2WhatCausedIt: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    // Q3: "⚠️ api-gateway deployed 12 min before first anomaly (@alice · 3 files)"
    //     OR "✅ No deploy found within the 30-minute window"
    q3DidWeCauseIt: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // rcaSummary: DB/audit prose — derived from Q1+Q2+Q3 joined, not shown in Slack.
    rcaSummary: Annotation<string | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
    // Q4: Array of concrete fix commands / actions produced by rca_node.
    fixSteps: Annotation<string[]>({
        reducer: (_left, right) => right,
        default: () => [],
    }),
    // Float 0–1 reflecting evidence quality across all signals (timeline, topology,
    // deploy correlation, runbooks). Distinct from correlate_node's categorical
    // 'HIGH' | 'MEDIUM' | 'LOW' — this is rca_node's holistic assessment.
    rcaConfidence: Annotation<number | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),

    // ─── Human-in-the-loop ─────────────────────────────────────────────────────
    humanDecision: Annotation<'approved' | 'dismissed' | null>({
        reducer: (_left, right) => right,
        default: () => null,
    }),
});
