import { logger } from '../../shared/logger.js';
import { AgentStateSchema } from '../agentStateSchema.js';
import { slack } from '../slack/client.js';
import { prisma } from '../prisma.js';
import { AgentError } from '../errors.js';
import type { KnownBlock } from '@slack/web-api';

const nodeLogger = logger.child({ context: 'notify_node' });

// ─── notify_node ──────────────────────────────────────────────────────────────
//
// Runs only on the APPROVED path (conditional edge from human_review_node).
// Responsibilities:
//   1. Build the public channel Block Kit message — thin renderer, same as the
//      DM but without action buttons and with an "Approved" footer.
//      All Q1/Q2/Q3 content comes verbatim from state (LLM strings from rca_node).
//   2. Post to SLACK_INCIDENTS_CHANNEL.
//   3. Persist APPROVED status + slack_broadcast_ts to the incidents row.
//   4. Mark all related anomalies as processed.

export async function notify_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const { incidentId } = state;

    nodeLogger.info({ incidentId }, 'notify_node: posting approved RCA to Slack');

    const webhookUrl = state.orgConfig?.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;
    let broadcastTs: string | undefined;

    // ── 1. Post to Slack (Webhook URL preferred, Bot Token fallback) ─────────
    if (webhookUrl && webhookUrl.startsWith('https://hooks.slack.com/')) {
        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `[VIGIL] Incident #${shortId(incidentId)} RCA approved`,
                    blocks: buildChannelBlocks(state),
                }),
            });
            if (res.ok) {
                broadcastTs = new Date().toISOString();
                nodeLogger.info({ incidentId }, 'notify_node: broadcasted to Slack webhook');
            } else {
                nodeLogger.warn({ incidentId, status: res.status }, 'notify_node: Slack webhook returned non-200');
            }
        } catch (webhookErr) {
            nodeLogger.warn({ incidentId, err: webhookErr }, 'notify_node: failed to post to Slack webhook');
        }
    }

    if (!broadcastTs && process.env.SLACK_BOT_TOKEN) {
        const channel = process.env.SLACK_INCIDENTS_CHANNEL ?? 'C0000000000';
        try {
            const result = await slack.chat.postMessage({
                channel,
                text: `[VIGIL] Incident #${shortId(incidentId)} RCA approved`,
                blocks: buildChannelBlocks(state),
            });
            broadcastTs = result.ts ?? undefined;
            nodeLogger.info({ incidentId, channel, ts: broadcastTs }, 'notify_node: channel message posted via bot token');
        } catch (err) {
            nodeLogger.warn({ incidentId, err }, 'notify_node: failed to post to Slack channel via bot token');
        }
    }

    // ── 2. Persist approval + broadcast ts ───────────────────────────────────
    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status: 'APPROVED',
                notification_sent: true,
                slack_broadcast_ts: broadcastTs ?? null,
            },
        });
    } catch (err) {
        nodeLogger.error(
            { incidentId, err },
            'notify_node: failed to persist APPROVED status'
        );
    }

    // ── 3. Mark all anomalies as processed ───────────────────────────────────
    try {
        await prisma.anomaly.updateMany({
            where: { incident_id: incidentId },
            data: { processed: true },
        });
    } catch (err) {
        nodeLogger.error({ incidentId, err }, 'notify_node: failed to mark anomalies processed');
    }

    nodeLogger.info({ incidentId }, 'notify_node: done');
    return {};
}

// ─── Block Kit channel message builder — thin renderer ───────────────────────

function buildChannelBlocks(state: typeof AgentStateSchema.State): KnownBlock[] {
    const { incidentId, q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt, fixSteps, runbookChunks } = state;
    const id = shortId(incidentId);

    return [
        // ── Header ────────────────────────────────────────────────────────────
        {
            type: 'header',
            text: { type: 'plain_text', text: `[VIGIL] Incident #${id}`, emoji: false },
        },
        { type: 'divider' },

        // ── Q1: LLM answer dropped verbatim ──────────────────────────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q1 — What broke?*\n${q1WhatBroke ?? '_Analysis unavailable_'}`,
            },
        },

        // ── Q2: LLM answer dropped verbatim ──────────────────────────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q2 — What caused it?*\n${q2WhatCausedIt ?? '_Analysis unavailable_'}`,
            },
        },

        // ── Q3: LLM answer dropped verbatim ──────────────────────────────────
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Q3 — Did we cause it?*\n${q3DidWeCauseIt ?? '_Analysis unavailable_'}`,
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

        // ── Approval footer ───────────────────────────────────────────────────
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `[APPROVED] *Approved* · ${new Date().toUTCString()} · \`${incidentId}\``,
                },
            ],
        },
    ];
}

// ─── Minimal helpers (structural only, not content) ───────────────────────────

/** First 8 chars of the UUID — readable without being overwhelming. */
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
    return `Runbook: _${title}${match}_`;
}
