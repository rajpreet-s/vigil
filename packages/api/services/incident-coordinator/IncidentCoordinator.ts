import { type Anomaly, type Incident, PrismaClient } from '@prisma/client';
type UUID = string;
import { randomUUID } from 'crypto';
import type { FastifyBaseLogger } from 'fastify';
import {
    INCIDENT_LOOKBACK_WINDOW_MS,
    INCIDENT_HARD_MAX_DURATION_MS,
    INCIDENT_SETTLE_DELAY_MS
} from '../../constants/timerConstants.js';
import { triggerIncidentAnalysis } from './IncidentAnalysisTrigger.js';

export class IncidentCoordinator {
    private anomalyId: UUID;
    private prisma: PrismaClient;
    private logger: FastifyBaseLogger | undefined;

    // Track active settle timers in-memory mapped by incident ID
    private static activeTimers = new Map<string, NodeJS.Timeout>();
    
    constructor(anomalyId: UUID, prisma: PrismaClient, logger?: FastifyBaseLogger) {
        this.anomalyId = anomalyId;
        this.prisma = prisma;
        this.logger = logger;
    }

    async coordinate() {
        // 1. Fetch the anomaly to get details
        const anomaly = await this.prisma.anomaly.findUnique({
            where: { id: this.anomalyId }
        });
        
        if (!anomaly) {
            throw new Error(`Anomaly with ID ${this.anomalyId} not found.`);
        }
        
        // 2. Query: Find all active, non-stale OPEN incidents within lookback window
        const lookbackLimit = new Date(anomaly.detected_at.getTime() - INCIDENT_LOOKBACK_WINDOW_MS);
        const activeIncidents = await this.prisma.incident.findMany({
            where: {
                status: 'OPEN',
                updated_at: {
                    gt: lookbackLimit
                }
            },
            orderBy: {
                started_at: 'asc' // Prioritize oldest active incident to preserve the original root cause
            }
        });

        // 3. Coordinate: Determine which incident (if any) this anomaly belongs to
        for (const incident of activeIncidents) {
            // Case A: Existing service re-fires inside this incident
            // ON CONFLICT equivalent — silent link, no settle timer reset
            if (incident.services_affected.includes(anomaly.service_name)) {
                this.logger?.info(
                    `[IC] Service "${anomaly.service_name}" re-fired in incident ${incident.id}. Linking silently (no timer reset).`
                );
                await this.prisma.anomaly.update({
                    where: { id: this.anomalyId },
                    data: { incident_id: incident.id }
                });
                return;
            }

            // Case B: New service — check topology (if available) or fall back to temporal
            const resolution = await this.resolveIncident(anomaly.service_name, incident);
            if (resolution.matched) {
                this.logger?.info(
                    `[IC] Service "${anomaly.service_name}" joined incident ${incident.id} via ${resolution.layer}.`
                );
                const updatedIncident = await this.pushIncidentServices(incident, anomaly.service_name);
                this.resetSettleTimer(updatedIncident.id, updatedIncident.started_at);
                return;
            }
        }

        // Case C: No match across any active incident → start a new incident
        this.logger?.info(
            `[IC] No active incident matched for service "${anomaly.service_name}". Creating new incident.`
        );
        const newIncident = await this.createNewIncident(anomaly);
        this.resetSettleTimer(newIncident.id, newIncident.started_at);
    }

    /**
     * Two-layer incident resolution strategy for a new service joining an incident.
     *
     * Layer 1 — Topology (explicit dependency graph):
     *   When the topology table is populated, query for a direct edge between the
     *   new service and any service already in the incident. Topology is authoritative:
     *   if it is present but has no edge, no fallback is attempted.
     *
     * Layer 2 — Temporal correlation (implicit, time-based):
     *   Sole fallback when topology is absent. Any service that fires an anomaly
     *   while an incident is still OPEN is considered part of that incident's blast
     *   radius. The lookback window enforced at the coordinate() query level IS the
     *   time boundary — no additional inner filter is applied.
     *
     *   Why time alone is the right signal without topology:
     *   - Causation implies temporal ordering. If B fails after A, and A's incident
     *     is still open, that is the strongest available signal that B is in the
     *     same blast radius.
     *   - Cascade failures propagate as DIFFERENT metrics (redis: db_connections,
     *     checkout: error_rate) — so metric-level similarity would reject real cascades
     *     as false negatives.
     *   - Having a slightly too-broad blast radius is always safer than splitting a
     *     real cascade across two incidents. The AI analysis pipeline can separate
     *     unrelated services from the causal timeline post-grouping.
     *
     * Layer 3 — No match: caller creates a new isolated incident.
     */
    private async resolveIncident(
        serviceName: string,
        incident: Incident
    ): Promise<{ matched: boolean; layer: string }> {

        // ── Layer 1: Topology ─────────────────────────────────────────────────
        const topologyCount = await this.prisma.topology.count();
        if (topologyCount > 0) {
            const edge = await this.prisma.topology.findFirst({
                where: {
                    OR: [
                        { upstream_service: serviceName, downstream_service: { in: incident.services_affected } },
                        { upstream_service: { in: incident.services_affected }, downstream_service: serviceName }
                    ]
                }
            });
            if (edge) {
                return { matched: true, layer: 'topology' };
            }
            // Topology is defined but no edge found — authoritative. No fallback.
            this.logger?.info(
                `[IC] Topology present (${topologyCount} edges) but no edge for "${serviceName}" in incident ${incident.id}. No match.`
            );
            return { matched: false, layer: 'none' };
        }

        // ── Layer 2: Temporal correlation ─────────────────────────────────────
        // No topology defined. The incident is already bounded to the lookback window
        // by the coordinate() query — any OPEN incident within that window is a
        // valid grouping candidate. Accept this service into the blast radius.
        this.logger?.warn(
            `[IC] No topology defined. Grouping "${serviceName}" into incident ${incident.id} via temporal correlation. ` +
            `Add topology.yaml for precise dependency-aware grouping.`
        );
        return { matched: true, layer: 'temporal-correlation' };
    }

    private resetSettleTimer(incidentId: string, startedAt: Date) {
        // Clear any existing settle timer for this incident
        const existingTimer = IncidentCoordinator.activeTimers.get(incidentId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            IncidentCoordinator.activeTimers.delete(incidentId);
        }

        const now = new Date().getTime();
        const start = startedAt.getTime();
        const hardMaxTime = start + INCIDENT_HARD_MAX_DURATION_MS;

        // If we have already reached or exceeded the hard max, do not reset the timer
        if (now >= hardMaxTime) {
            this.logger?.info(
                `[IncidentCoordinator] Hard max (${INCIDENT_HARD_MAX_DURATION_MS / 60000}m) reached for incident ${incidentId}. Settle timer will not be reset.`
            );
            return;
        }

        // Calculate actual delay: either the settle delay, or the remaining time until the hard max, whichever is smaller
        const remainingTime = hardMaxTime - now;
        const delay = Math.min(INCIDENT_SETTLE_DELAY_MS, remainingTime);

        this.logger?.info(
            `[IncidentCoordinator] Resetting settle timer for incident ${incidentId} to ${delay / 1000}s (remaining hard max window: ${remainingTime / 1000}s).`
        );

        const timer = setTimeout(async () => {
            IncidentCoordinator.activeTimers.delete(incidentId);
            await triggerIncidentAnalysis(incidentId, this.prisma, this.logger);
        }, delay);

        IncidentCoordinator.activeTimers.set(incidentId, timer);
    }

    private async pushIncidentServices(incident: Incident, serviceName: string) {
        // Clean deduplication: only add serviceName if it's not already listed
        const updatedServices = incident.services_affected.includes(serviceName)
            ? incident.services_affected
            : [...incident.services_affected, serviceName];

        // 1. Update the incident services list and timing window
        const updatedIncident = await this.prisma.incident.update({
            where: { id: incident.id },
            data: {
                services_affected: updatedServices,
                updated_at: new Date()
            }
        });

        // 2. Link the anomaly to the existing incident
        await this.prisma.anomaly.update({
            where: { id: this.anomalyId },
            data: {
                incident_id: incident.id
            }
        });
        
        this.logger?.info(`[IncidentCoordinator] Associated anomaly ${this.anomalyId} to existing incident ${incident.id}`);
        return updatedIncident;
    }

    private async createNewIncident(anomaly: Anomaly) {
        // Generate a stable UUID for both ID and thread_id matching the flow architecture
        const incidentId = randomUUID() as UUID;

        // 1. Insert new Incident row
        const incident = await this.prisma.incident.create({
            data: {
                id: incidentId,
                thread_id: incidentId,
                status: 'OPEN',
                services_affected: [anomaly.service_name],
                blast_radius: [anomaly.service_name],
                started_at: anomaly.detected_at,
                updated_at: anomaly.detected_at
            }
        });

        // 2. Link the anomaly to the fresh incident
        await this.prisma.anomaly.update({
            where: { id: this.anomalyId },
            data: {
                incident_id: incidentId
            }
        });

        this.logger?.info(`[IncidentCoordinator] Created new incident ${incidentId} for service ${anomaly.service_name}`);
        return incident;
    }

    public static async onDeployArrived(deployId: string, prisma?: PrismaClient, logger?: FastifyBaseLogger) {
        const log = logger || console;
        log.info(`[IncidentCoordinator] onDeployArrived triggered for deployment: ${deployId}`);
        
        if (!prisma) return;

        try {
            const deploy = await prisma.deployEvent.findUnique({
                where: { id: deployId }
            });
            if (!deploy) {
                log.warn(`[IncidentCoordinator] Deployment event ${deployId} not found in database.`);
                return;
            }
            log.info(`[IncidentCoordinator] Successfully processed deployment event for service ${deploy.service_name}`);
        } catch (err) {
            log.error(err, `[IncidentCoordinator] Error in onDeployArrived for deployment ${deployId}`);
        }
    }
}
