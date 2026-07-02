import { interrupt } from '@langchain/langgraph';
import { AgentStateSchema } from '../agentStateSchema.js';
import { logger } from '../../shared/logger.js';
import { prisma } from '../prisma.js';
import { AgentError } from '../errors.js';
import { slack } from '../slack/client.js';
import type { KnownBlock } from '@slack/web-api';

const nodeLogger = logger.child({ context: 'human_review_node' });

// ─── human_review_node ────────────────────────────────────────────────────────
//
// Human-in-the-loop gate. Two-phase pattern using LangGraph's interrupt():
//
//   Phase 1 (first invocation — humanDecision is null):
//     1. Build Block Kit DM from the LLM-authored Q1/Q2/Q3/Q4 strings.
//        No formatting logic here — we are a thin renderer.
//     2. Send DM to the on-call engineer.
//     3. Mark incident PENDING_REVIEW.
//     4. Call interrupt() — throws GraphInterrupt, checkpoints state, suspends.
//
//   Phase 2 (resume — graph.invoke() called again with humanDecision in state):
//     LangGraph re-enters from the top. humanDecision !== null → Phase 2.
//     - dismissed → mark incident DISMISSED + anomalies processed.
//     - approved  → nothing; notify_node handles the channel post.

export async function human_review_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const { incidentId, humanDecision } = state;

    // ── Phase 2: Resume after human decision (bypassing Phase 1 DM sending) ────
    if (humanDecision !== null) {
        nodeLogger.info({ incidentId, humanDecision }, 'human_review_node: Phase 2 — resumed with decision');
        if (humanDecision === 'dismissed') {
            await dismissIncident(incidentId);
        }
        return {};
    }

    // ── Phase 1: First invocation — send DM and suspend ──────────────────────
    nodeLogger.info({ incidentId }, 'human_review_node: Phase 1 — building on-call DM');

    const dmTarget =
        process.env.SLACK_ONCALL_USER_ID ??
        process.env.SLACK_INCIDENTS_CHANNEL ??
        'C0000000000';

    try {
        await slack.chat.postMessage({
            channel: dmTarget,
            text: `⚡ Vigil — Incident #${shortId(incidentId)} requires your review`,
            blocks: buildDmBlocks(state),
        });
        nodeLogger.info({ incidentId, dmTarget }, 'human_review_node: DM sent');
    } catch (err) {
        throw new AgentError('human_review', 'Failed to send on-call Slack DM', err);
    }

    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: { status: 'PENDING_REVIEW' },
        });
    } catch (err) {
        nodeLogger.error({ incidentId, err }, 'human_review_node: failed to set PENDING_REVIEW');
    }

    // Suspends here — LangGraph checkpoints state and throws GraphInterrupt.
    // When resumed using Command({ resume: decision }), it returns the decision value.
    const decision = interrupt({ reason: 'awaiting_human_decision', incidentId }) as 'approved' | 'dismissed';

    // Fallback Phase 2 (if humanDecision was not updated prior to executing this node)
    nodeLogger.info({ incidentId, decision }, 'human_review_node: Phase 2 (fallback) — resumed with decision');
    if (decision === 'dismissed') {
        await dismissIncident(incidentId);
    }

    return { humanDecision: decision };
}

// ─── dismissIncident ──────────────────────────────────────────────────────────

async function dismissIncident(incidentId: string): Promise<void> {
    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: { status: 'DISMISSED' },
        });
        await prisma.anomaly.updateMany({
            where: { incident_id: incidentId },
            data: { processed: true },
        });
        nodeLogger.info({ incidentId }, 'human_review_node: incident dismissed');
    } catch (err) {
        nodeLogger.error({ incidentId, err }, 'human_review_node: failed to write DISMISSED status');
    }
}

// ─── Block Kit DM builder — thin renderer ────────────────────────────────────
//
// This function contains ZERO formatting logic.
// All Q1/Q2/Q3 content is written by the LLM in rca_node and stored in state
// as Slack mrkdwn strings. We drop them verbatim into Block Kit sections.
// Only Q4 (fix steps array → numbered list) needs trivial array formatting here.
//
// Layout:
//   Header   ⚡ Vigil — Incident #<short-id>
//   Context  incident UUID · timestamp
//   Divider
//   Q1       What broke?     ← state.q1WhatBroke   (LLM string)
//   Q2       What caused it? ← state.q2WhatCausedIt (LLM string)
//   Q3       Did we cause it?← state.q3DidWeCauseIt (LLM string)
//   Q4       What do I do?   ← state.fixSteps[]    (array → numbered list)
//   Divider
//   Actions  [✅ Approve — send to #all-vigil]  [✗ Dismiss]

function buildDmBlocks(state: typeof AgentStateSchema.State): KnownBlock[] {
    const { incidentId, q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt, fixSteps, runbookChunks } = state;
    const id = shortId(incidentId);

    return [
        // ── Header ────────────────────────────────────────────────────────────
        {
            type: 'header',
            text: { type: 'plain_text', text: `⚡ Vigil — Incident #${id}`, emoji: true },
        },
        {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `\`${incidentId}\` · ${new Date().toUTCString()}` }],
        },
        { type: 'divider' },

        // ── Q1: LLM answer dropped verbatim ──────────────────────────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q1 — What broke?*\n${q1WhatBroke ?? '_Analysis pending…_'}`,
            },
        },

        // ── Q2: LLM answer dropped verbatim ──────────────────────────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q2 — What caused it?*\n${q2WhatCausedIt ?? '_Analysis pending…_'}`,
            },
        },

        // ── Q3: LLM answer dropped verbatim ──────────────────────────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q3 — Did we cause it?*\n${q3DidWeCauseIt ?? '_Analysis pending…_'}`,
            },
        },

        // ── Q4: fix steps (array → numbered list) + runbook hint ─────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q4 — What do I do?*\n${formatFixSteps(fixSteps)}${runbookHint(runbookChunks)}`,
            },
        },

        { type: 'divider' },

        // ── Actions: Approve / Dismiss ────────────────────────────────────────
        // action_id encodes the incidentId so /slack/interactions can recover
        // the thread_id for graph.invoke() without a DB lookup.
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: '✅ Approve — send to #all-vigil', emoji: true },
                    style: 'primary',
                    value: 'approved',
                    action_id: `approve:${incidentId}`,
                    confirm: {
                        title: { type: 'plain_text', text: 'Approve this RCA?' },
                        text: {
                            type: 'mrkdwn',
                            text: 'This will post the analysis to #all-vigil and mark the incident approved.',
                        },
                        confirm: { type: 'plain_text', text: 'Yes, approve' },
                        deny: { type: 'plain_text', text: 'Cancel' },
                    },
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: '✗ Dismiss', emoji: true },
                    style: 'danger',
                    value: 'dismissed',
                    action_id: `dismiss:${incidentId}`,
                    confirm: {
                        title: { type: 'plain_text', text: 'Dismiss this incident?' },
                        text: {
                            type: 'mrkdwn',
                            text: 'This will mark the incident dismissed. No public notification will be sent.',
                        },
                        confirm: { type: 'plain_text', text: 'Yes, dismiss' },
                        deny: { type: 'plain_text', text: 'Cancel' },
                    },
                },
            ],
        },
    ];
}

// ─── Minimal helpers (structural only, not content) ───────────────────────────

/** First 8 chars of the UUID — readable in Slack without being too long. */
function shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
}

/** Convert fixSteps string[] to a numbered mrkdwn list. */
function formatFixSteps(steps: string[]): string {
    if (steps.length === 0) return '_No fix steps available._\n';
    return steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n';
}

/** One-line runbook hint from the top-ranked chunk. */
function runbookHint(
    chunks: { content: string | null; metadata: Record<string, unknown> | null }[]
): string {
    if (chunks.length === 0) return '';
    const top = chunks[0];
    const title = (top.metadata?.title as string) ?? 'Runbook';
    const distance = top.metadata?.distance != null ? Number(top.metadata.distance) : null;
    const match = distance !== null ? ` (${Math.round((1 - distance) * 100)}% match)` : '';
    return `📖 Runbook: _${title}${match}_`;
}
