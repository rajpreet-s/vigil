import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

const AGENT_URL = process.env.AGENT_URL ?? "http://agent:3001";

/**
 * Called when the IncidentCoordinator settle timer fires.
 *
 * Responsibilities:
 *   1. Mark the incident as PROCESSING in Postgres (prevents duplicate triggers).
 *   2. POST to the agent container's /analyze/:incidentId endpoint.
 *      The agent returns 202 immediately and runs the LangGraph pipeline async.
 *
 * The agent URL is configured via the AGENT_URL env var:
 *   - Docker Compose: http://agent:3001  (service name resolution)
 *   - Local dev:      http://localhost:3001
 */
export async function triggerIncidentAnalysis(
    incidentId: string,
    prisma: PrismaClient,
    logger?: FastifyBaseLogger
): Promise<void> {
    logger?.info(
        `[IncidentCoordinator] Settle timer expired — triggering analysis for incident ${incidentId}`
    );

    // ── 1. Mark PROCESSING ────────────────────────────────────────────────────
    // Prevents a second settle timer (e.g. from a race on restart) from
    // triggering duplicate graph runs. The agent's SKIP LOCKED query also
    // guards against this, but defence in depth is cheap here.
    let incident;
    try {
        incident = await prisma.incident.update({
            where: { id: incidentId },
            data: { status: "PROCESSING" }
        });
    } catch (err) {
        logger?.error(err, `[IncidentCoordinator] Failed to mark incident ${incidentId} as PROCESSING`);
        return;
    }

    logger?.info(
        `[IncidentCoordinator] Incident ${incidentId} marked PROCESSING. Affected services: [${incident.services_affected.join(', ')}]`
    );

    // ── 2. Trigger the agent ──────────────────────────────────────────────────
    try {
        const res = await fetch(`${AGENT_URL}/analyze/${incidentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            logger?.error(
                `[IncidentCoordinator] Agent returned HTTP ${res.status} for incident ${incidentId}`
            );
            return;
        }

        logger?.info(
            `[IncidentCoordinator] Agent accepted analysis job for incident ${incidentId} (HTTP ${res.status})`
        );
    } catch (err) {
        // Network-level failure (agent down, DNS failure, etc.)
        logger?.error(err, `[IncidentCoordinator] Failed to reach agent at ${AGENT_URL} for incident ${incidentId}`);
    }
}
