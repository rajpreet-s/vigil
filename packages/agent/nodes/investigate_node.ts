import { AgentStateSchema } from '../agentStateSchema.js';
import { logger } from '../../shared/index.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import {
    queryPrometheusRangeTool,
    queryRelatedMetricsTool,
    getMetricBaselineTool,
    getRecentDeploymentsTool,
    makeGetBlastRadiusTool,
} from '../tools/investigationTools.js';

const nodeLogger = logger.child({ context: 'investigate_node' });

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 5; // cap tool-call rounds to control latency + cost

// ─── investigate_node ─────────────────────────────────────────────────────────
//
// Agentic evidence-gathering loop. Only runs when confidence === 'LOW'.
//
// The LLM receives the incident context and decides which tools to call.
// It iterates (up to MAX_ITERATIONS rounds) until it has gathered enough
// evidence to write a structured investigationFindings summary.
//
// Output: investigationFindings — a plain-text evidence block that rca_node
// injects into its prompt alongside causalTimeline, deployCorrelation, and
// runbookChunks to answer the 4 questions.

export async function investigate_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const {
        incidentId,
        rawAnomalies,
        causalTimeline,
        rootCauseCandidate,
        confidence,
        deployCorrelation,
        topology,
    } = state;

    nodeLogger.info(
        {
            incidentId,
            confidence,
            rawAnomalies: rawAnomalies.length,
            rootCauseCandidate: rootCauseCandidate?.service_name ?? null,
        },
        'investigate_node: starting agentic investigation'
    );

    // ── Build tools list ──────────────────────────────────────────────────────
    const tools: StructuredToolInterface[] = [
        queryPrometheusRangeTool,
        queryRelatedMetricsTool,
        getMetricBaselineTool,
        getRecentDeploymentsTool,
        makeGetBlastRadiusTool(topology ?? null),
    ];

    // ── Initialise Gemini with tools bound ───────────────────────────────────
    const llm = new ChatGoogleGenerativeAI({
        model: 'gemini-3.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
        temperature: 0, // deterministic — we want evidence, not creativity
    }).bindTools(tools);

    // ── Build system prompt ───────────────────────────────────────────────────
    const timelineText =
        causalTimeline.length > 0
            ? causalTimeline
                  .map(
                      (a) =>
                          `  ${a.detected_at.toISOString()}  ${a.service_name}  (metric: ${a.metric_name})`
                  )
                  .join('\n')
            : rawAnomalies
                  .map(
                      (a) =>
                          `  ${a.detected_at.toISOString()}  ${a.service_name}  (metric: ${a.metric_name})`
                  )
                  .join('\n');

    const systemPrompt = `You are an SRE agent investigating a production incident.
The structural analysis (correlate_node) returned LOW confidence, meaning the dependency graph alone could not pinpoint the root cause. Your job is to gather additional metric evidence using the available tools, then write a concise findings summary.

═══════════════════════════════════════
INCIDENT CONTEXT
  Incident ID:           ${incidentId}
  Root cause candidate:  ${rootCauseCandidate ? `${rootCauseCandidate.service_name} (metric: ${rootCauseCandidate.metric_name}, detected: ${rootCauseCandidate.detected_at.toISOString()})` : 'Not identified'}
  Confidence:            ${confidence ?? 'UNKNOWN'}

ANOMALOUS SERVICES (chronological order):
${timelineText}

DEPLOY CORRELATION (pre-computed, 30-min window):
${deployCorrelation ?? 'None — no deploy found within 30 minutes of any anomaly'}
═══════════════════════════════════════

AVAILABLE TOOLS:
  1. query_prometheus_range(metric, service, windowMinutes) — time-series trend, spike vs gradual
  2. query_related_metrics(service, timestamp)              — all health signals at incident time
  3. get_metric_baseline(metric, service)                   — 7-day avg, "44x above normal" not just "18%"
  4. get_recent_deployments(service, windowMinutes)         — deploy history from DB (wider window than pre-computed)
  5. get_blast_radius(service)                             — downstream dependents in topology

INVESTIGATION STRATEGY:
  Start with the root cause candidate. Call query_related_metrics and get_metric_baseline first
  to understand the severity. Then call query_prometheus_range to see if the spike was sudden
  or gradual. Check get_recent_deployments with a wider window if deployCorrelation is empty.
  Use get_blast_radius to confirm or deny the cascade story.

FINISH CONDITION:
  When you have gathered enough evidence to answer what broke, what caused it, and whether a
  deploy was involved — stop calling tools and write your findings in this exact format:

[INVESTIGATION FINDINGS]
  Root cause assessment: <service> — <what happened>
  Cause type: <resource exhaustion | bad deploy | upstream dependency | unknown>
  Evidence:
    - <tool result summary 1>
    - <tool result summary 2>
    ...
  Deploy involved: <yes | no | uncertain> — <brief reason>
  Recommended focus for on-call:
    1. <first action>
    2. <second action>

Do NOT include the format tags in your tool calls. Only write the findings block as your final message when you are done calling tools.`;

    // ── Agentic loop ──────────────────────────────────────────────────────────
    const messages: (HumanMessage | SystemMessage | AIMessage | ToolMessage)[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(
            'Begin your investigation. Call tools to gather evidence, then write your findings.'
        ),
    ];

    let investigationFindings: string | null = null;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        nodeLogger.info({ iteration: iterations }, 'investigate_node: LLM iteration');

        const response = (await llm.invoke(messages)) as AIMessage;
        messages.push(response);

        // ── Check if LLM wants to call tools ─────────────────────────────────
        const toolCalls = response.tool_calls ?? [];

        if (toolCalls.length === 0) {
            // No tool calls → LLM is done, extract findings from text content
            const content =
                typeof response.content === 'string'
                    ? response.content
                    : Array.isArray(response.content)
                      ? response.content
                            .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
                            .map((c) => c.text)
                            .join('\n')
                      : '';

            investigationFindings = content.trim();
            nodeLogger.info(
                { iterations, length: investigationFindings.length },
                'investigate_node: LLM finished — findings extracted'
            );
            break;
        }

        // ── Execute each tool call in parallel ────────────────────────────────
        nodeLogger.info(
            { iteration: iterations, tools: toolCalls.map((tc) => tc.name) },
            'investigate_node: executing tool calls'
        );

        const toolResults = await Promise.all(
            toolCalls.map(async (toolCall) => {
                const tool = tools.find((t) => t.name === toolCall.name);
                if (!tool) {
                    return new ToolMessage({
                        tool_call_id: toolCall.id ?? toolCall.name,
                        content: `Unknown tool: ${toolCall.name}`,
                    });
                }

                try {
                    const result = await tool.invoke(toolCall.args as Record<string, unknown>);
                    nodeLogger.info(
                        { tool: toolCall.name, args: toolCall.args },
                        'investigate_node: tool call complete'
                    );
                    return new ToolMessage({
                        tool_call_id: toolCall.id ?? toolCall.name,
                        content: typeof result === 'string' ? result : JSON.stringify(result),
                    });
                } catch (err) {
                    const errMsg = `Tool "${toolCall.name}" threw: ${err instanceof Error ? err.message : String(err)}`;
                    nodeLogger.warn({ tool: toolCall.name, err }, 'investigate_node: tool error');
                    return new ToolMessage({
                        tool_call_id: toolCall.id ?? toolCall.name,
                        content: errMsg,
                    });
                }
            })
        );

        messages.push(...toolResults);
    }

    // ── Max iterations hit without a finish ───────────────────────────────────
    if (!investigationFindings) {
        nodeLogger.warn(
            { iterations: MAX_ITERATIONS },
            'investigate_node: max iterations reached without findings — using partial evidence'
        );

        // Summarise what tool results we did get as a fallback findings block
        const toolResultSummaries = messages
            .filter((m): m is ToolMessage => m.type === 'tool')
            .map(
                (m) =>
                    `  - ${typeof m.content === 'string' ? m.content.slice(0, 300) : '(non-text)'}`
            )
            .join('\n');

        investigationFindings =
            `[INVESTIGATION FINDINGS — PARTIAL (max iterations reached)]\n` +
            `  Root cause assessment: insufficient evidence gathered\n` +
            `  Evidence collected:\n${toolResultSummaries || '  (none)'}`;
    }

    nodeLogger.info(
        { investigationFindings: investigationFindings.slice(0, 200) },
        'investigate_node: complete'
    );

    return { investigationFindings };
}