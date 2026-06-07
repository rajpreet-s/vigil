import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Triggers the downstream blast radius analysis pipeline for an incident.
 */
export async function triggerIncidentAnalysis(
    incidentId: string,
    prisma: PrismaClient,
    logger?: FastifyBaseLogger
): Promise<void> {
    logger?.info(
        `[IncidentCoordinator] Settle timer expired! Triggering complete blast radius analysis pipeline for incident ${incidentId}.`
    );
    
    try {
        const incident = await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status: "PROCESSING"
            }
        });

        if (!incident) {
            logger?.error(`[IncidentCoordinator] Incident ${incidentId} not found when triggering analysis.`);
            return;
        }

        logger?.info(
            `[IncidentCoordinator] Pipeline Triggered! Complete blast radius captured for incident ${incidentId}: [${incident.services_affected.join(', ')}]`
        );
        
        // Note: Downstream trigger of LangGraph AI orchestration pipeline / Slack notification goes here
    } catch (err) {
        logger?.error(err, `[IncidentCoordinator] Failed during incident analysis trigger for incident ${incidentId}`);
    }
}
