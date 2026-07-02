import { AgentStateSchema } from '../agentStateSchema.js';
import { logger } from '../../shared/index.js';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { prisma } from '../prisma.js';
import { AgentError } from '../errors.js';
import { Anomaly } from '@prisma/client';
import type { TopologyGraph } from '../../shared/topology/types.js';
import { invokeLlmWithRetryAndFallback } from '../llm.js';

const nodeLogger = logger.child({ context: 'rca_node' });

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hard cap on runbook text injected into the prompt to avoid exceeding context. */
const MAX_RUNBOOK_CHARS = 3_000;

// ─── rca_node ─────────────────────────────────────────────────────────────────
//
// Final analysis node. Single LLM call — no tool loop.
//
// All evidence is already in state by the time this node runs:
//   causalTimeline      → Q1: what broke, in order
//   rootCauseCandidate  → Q2: the correlate_node best guess
//   topology            → Q2: filtered neighbor subgraph of anomalous services
//   deployCorrelation   → Q3: did a deploy precede the incident?
//   investigationFindings → supplemental evidence from investigate_node (LOW confidence path)
//   runbookChunks       → Q4: concrete fix commands
//
// Output: rcaSummary, fixSteps, rcaConfidence written to both state (for
// downstream nodes) and the incidents DB row (for the Slack notification + UI).

export async function rca_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const {
        incidentId,
        rootCauseCandidate,
        deployCorrelation,
        causalTimeline,
        runbookChunks,
        investigationFindings,
        topology,
        confidence,
    } = state;

    nodeLogger.info(
        {
            incidentId,
            correlateConfidence: confidence,
            timelineLength: causalTimeline.length,
            runbookChunks: runbookChunks.length,
            hasInvestigationFindings: !!investigationFindings,
            hasDeployCorrelation: !!deployCorrelation,
        },
        'rca_node: starting structured RCA'
    );

    // ── Build the prompt ──────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt({
        incidentId,
        causalTimeline,
        rootCauseCandidate,
        topology,
        deployCorrelation,
        investigationFindings,
        runbookChunks,
        correlateConfidence: confidence,
    });

    // ── Single LLM call with retry and model fallback ────────────────────────
    let rawText: string;
    try {
        const response = await invokeLlmWithRetryAndFallback([
            new SystemMessage(systemPrompt),
            new HumanMessage('Produce the JSON RCA output now.'),
        ], { temperature: 0, responseMimeType: 'application/json' });

        rawText =
            typeof response.content === 'string'
                ? response.content
                : Array.isArray(response.content)
                  ? response.content
                        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
                        .map((c) => c.text)
                        .join('\n')
                  : '';
    } catch (err) {
        throw new AgentError('rca', 'LLM call failed', err);
    }

    // ── Parse JSON output ─────────────────────────────────────────────────────
    const { q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt, fixSteps, rcaConfidence } =
        parseRcaResponse(rawText, incidentId);

    // Derive prose summary for DB/audit — Q1+Q2+Q3 joined. Not shown in Slack.
    const rcaSummary = [q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt]
        .filter(Boolean)
        .join(' | ');

    nodeLogger.info(
        {
            incidentId,
            rcaConfidence,
            fixStepsCount: fixSteps.length,
            q1Snippet: q1WhatBroke.slice(0, 80),
            q2Snippet: q2WhatCausedIt.slice(0, 80),
        },
        'rca_node: LLM analysis complete'
    );

    // ── Persist to incidents table ────────────────────────────────────────────
    // rcaSummary (prose join) and fix_steps go to DB; Q strings live in state.
    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: {
                rca_summary: rcaSummary,
                fix_steps: fixSteps,
                // confidence column is 'HIGH' | 'MEDIUM' | 'LOW' — store the
                // correlate_node categorical value; rcaConfidence (float) lives in state.
                confidence: confidence ?? undefined,
                root_cause_service: rootCauseCandidate?.service_name ?? undefined,
            },
        });

        nodeLogger.info({ incidentId }, 'rca_node: incident row updated with RCA output');
    } catch (err) {
        // DB write failure is non-fatal: the Slack notification can still be
        // sent from state. Log as error so on-call can investigate the DB.
        nodeLogger.error(
            { incidentId, err },
            'rca_node: failed to persist RCA to DB — continuing with state output'
        );
    }

    return { q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt, fixSteps, rcaConfidence, rcaSummary };
}

// ─── buildSystemPrompt ────────────────────────────────────────────────────────
//
// Assembles all pre-computed evidence into a single structured prompt.
// Each block maps to one of the 4 SRE questions so the LLM's job is purely
// to structure the evidence, not to reason from scratch.

interface PromptArgs {
    incidentId: string;
    causalTimeline: Anomaly[];
    rootCauseCandidate: Anomaly | null;
    topology: TopologyGraph | null;
    deployCorrelation: string | null;
    investigationFindings: string | null;
    runbookChunks: { content: string | null; metadata: Record<string, unknown> | null }[];
    correlateConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
}

export function buildSystemPrompt({
    incidentId,
    causalTimeline,
    rootCauseCandidate,
    topology,
    deployCorrelation,
    investigationFindings,
    runbookChunks,
    correlateConfidence,
}: PromptArgs): string {
    // ── Q1 evidence: causal timeline ─────────────────────────────────────────
    const timelineText =
        causalTimeline.length > 0
            ? causalTimeline
                  .map(
                      (a) =>
                          `  ${a.detected_at.toISOString()}  ${a.service_name}  (metric: ${a.metric_name})`
                  )
                  .join('\n')
            : '  (no causal timeline — no topology-connected anomalies found)';

    // ── Q2 evidence: filtered topology subgraph ─────────────────────────────
    // Only the direct neighbors of anomalous services — compact and LLM-readable.
    // The LLM interprets dependency direction itself rather than receiving a
    // pre-chosen path (which would be redundant with causalTimeline and would
    // hide non-anomalous neighbors useful for blast-radius reasoning).
    const topologySubgraph = buildTopologySubgraph(causalTimeline, topology);

    // ── Q4 evidence: runbook chunks ───────────────────────────────────────────
    const runbookText =
        runbookChunks.length > 0
            ? runbookChunks
                  .map((c, i) => {
                      const title = (c.metadata?.title as string) ?? `Chunk ${i + 1}`;
                      const match =
                          c.metadata?.distance != null
                              ? ` (${Math.round((1 - Number(c.metadata.distance)) * 100)}% match)`
                              : '';
                      return `[${title}${match}]\n${c.content ?? ''}`;
                  })
                  .join('\n\n')
                  .slice(0, MAX_RUNBOOK_CHARS)
            : '  (no runbook chunks retrieved)';

    return `You are an SRE incident analysis engine. Your job is NARROW: structure the pre-computed evidence below into a JSON RCA report. Do not invent facts — only synthesise what is given.

═══════════════════════════════════════
INCIDENT ID: ${incidentId}
STRUCTURAL CONFIDENCE: ${correlateConfidence ?? 'UNKNOWN'} (from topology graph analysis)
═══════════════════════════════════════

━━━ Q1 EVIDENCE — WHAT BROKE (causal timeline, chronological) ━━━
${timelineText}

━━━ Q2 EVIDENCE — WHAT CAUSED IT (root cause + service dependency graph) ━━━
Root cause candidate: ${rootCauseCandidate ? `${rootCauseCandidate.service_name} (metric: ${rootCauseCandidate.metric_name}, first seen: ${rootCauseCandidate.detected_at.toISOString()})` : 'Not identified'}

Service dependency graph (direct neighbors of affected services only):
${topologySubgraph}

━━━ Q3 EVIDENCE — DID WE CAUSE IT (deploy correlation) ━━━
${deployCorrelation ?? 'None — no deploy found within 30 minutes of any anomaly'}

━━━ SUPPLEMENTAL INVESTIGATION FINDINGS (from metric deep-dive, if available) ━━━
${investigationFindings ?? 'Not available — use causal timeline and deploy correlation above'}

━━━ Q4 EVIDENCE — WHAT TO DO (runbook excerpts, most relevant first) ━━━
${runbookText}

═══════════════════════════════════════
OUTPUT INSTRUCTIONS:

Return ONLY a valid JSON object. No markdown fences, no explanation text outside the JSON.
All string values must be valid Slack mrkdwn. Use *bold* for service/metric names and \`backticks\` for metric/command names.

{
  "q1WhatBroke": "<N> service(s) degraded in cascade:\n• *service_name* (\`metric_name\`) · HH:MM UTC\n• ...\n(list each anomalous service from the Q1 timeline chronologically. If timeline is empty: 'Insufficient topology data to establish cascade.')",

  "q2WhatCausedIt": "Root cause: *service_name* — \`metric_name\` first triggered at HH:MM UTC\ncascade: *svc1* (HH:MM UTC) → *svc2* (HH:MM UTC) → ...\nConfidence: *HIGH|MEDIUM|LOW* · topology-confirmed cascade\n(If root cause unknown: 'Root cause not conclusively identified. Confidence: *LOW*.')",

  "q3DidWeCauseIt": "<one of two forms>:\n  If deploy preceded anomaly: '⚠️ *service_name* deployed N min before first anomaly · @author · N files changed'\n  If no deploy:               '✅ No deploy found within the 30-minute window'",

  "fixSteps": [
    "<Specific CLI command or action verbatim from the runbook excerpts above — not generic advice>",
    "<Next step>",
    "..."
  ],

  "rcaConfidence": <float 0.0–1.0 reflecting overall evidence quality>
}

CONFIDENCE SCORING GUIDE:
  1.0  — HIGH structural confidence + deploy correlation matches + runbooks found
  0.7  — MEDIUM structural confidence OR partial evidence (missing one signal)
  0.4  — LOW structural confidence, no deploy, few or no runbooks
  0.1  — No timeline, no topology, no runbooks — insufficient evidence

fixSteps RULES:
  - Extract verbatim commands from the runbook excerpts (e.g. "redis-cli info stats | grep evicted_keys")
  - If no runbooks were retrieved, derive steps from the Q2 root cause (e.g. "kubectl describe pod -n <service>")
  - Always include a step to confirm the fix had effect (e.g. check the metric that triggered the alert)
  - Maximum 5 steps`;
}

// ─── buildTopologySubgraph ────────────────────────────────────────────────────
//
// Builds a compact adjacency description scoped to the services in the causal
// timeline. For each affected service we emit its direct upstream and downstream
// neighbors (the full neighborhood, not just anomalous ones) so the LLM can:
//   a) understand dependency direction
//   b) see non-anomalous neighbors for blast-radius and rule-out reasoning
//
// This replaces the old buildTopologyPath() pre-computed string, which was
// redundant with causalTimeline and hid the neighborhood context the LLM needs.
//
// Example output (5-10 lines regardless of total graph size):
//   redis:            upstream: []  downstream: [session-service, cache-worker]
//   session-service:  upstream: [redis]  downstream: [checkout, auth-service]
//   checkout:         upstream: [session-service, postgres]  downstream: [order-service]

export function buildTopologySubgraph(
    causalTimeline: Anomaly[],
    topology: TopologyGraph | null
): string {
    if (!topology) return '  (topology unavailable)';
    if (causalTimeline.length === 0) return '  (no affected services in causal timeline)';

    const lines = causalTimeline.map((anomaly) => {
        const svc = anomaly.service_name;
        const upstream = topology.getUpstream(svc);
        const downstream = topology.getDownstream(svc);

        const upStr = upstream.length > 0 ? `[${upstream.join(', ')}]` : '[]';
        const downStr = downstream.length > 0 ? `[${downstream.join(', ')}]` : '[]';

        return `  ${svc}:  upstream: ${upStr}  downstream: ${downStr}`;
    });

    return lines.join('\n');
}

// ─── parseRcaResponse ─────────────────────────────────────────────────────────
//
// Parses the LLM JSON response into the 4 per-question fields + rcaConfidence.
// On parse failure falls back gracefully:
//   - q1WhatBroke     → raw text (best-effort) or placeholder
//   - q2WhatCausedIt  → placeholder
//   - q3DidWeCauseIt  → placeholder
//   - fixSteps        → []
//   - rcaConfidence   → 0

interface RcaOutput {
    q1WhatBroke: string;
    q2WhatCausedIt: string;
    q3DidWeCauseIt: string;
    fixSteps: string[];
    rcaConfidence: number;
}

export function parseRcaResponse(rawText: string, incidentId: string): RcaOutput {
    // Strip markdown fences if the model ignores instructions
    const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);

        const q1WhatBroke =
            typeof parsed.q1WhatBroke === 'string' && parsed.q1WhatBroke.trim()
                ? parsed.q1WhatBroke.trim()
                : '_Insufficient data to determine what broke._';

        const q2WhatCausedIt =
            typeof parsed.q2WhatCausedIt === 'string' && parsed.q2WhatCausedIt.trim()
                ? parsed.q2WhatCausedIt.trim()
                : '_Root cause not identified._';

        const q3DidWeCauseIt =
            typeof parsed.q3DidWeCauseIt === 'string' && parsed.q3DidWeCauseIt.trim()
                ? parsed.q3DidWeCauseIt.trim()
                : '✅ No deploy found within the 30-minute window';

        const fixSteps = Array.isArray(parsed.fixSteps)
            ? parsed.fixSteps.filter((s: unknown): s is string => typeof s === 'string')
            : [];

        const rawConfidence = Number(parsed.rcaConfidence);
        const rcaConfidence = isNaN(rawConfidence) ? 0 : Math.min(1, Math.max(0, rawConfidence));

        return { q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt, fixSteps, rcaConfidence };
    } catch (parseErr) {
        nodeLogger.warn(
            { incidentId, parseErr, rawTextSnippet: rawText.slice(0, 200) },
            'rca_node: JSON parse failed — using raw text as Q1 fallback'
        );

        return {
            q1WhatBroke: cleaned.slice(0, 500) || '_RCA analysis unavailable._',
            q2WhatCausedIt: '_Root cause not identified._',
            q3DidWeCauseIt: '✅ No deploy correlation data available.',
            fixSteps: [],
            rcaConfidence: 0,
        };
    }
}