import { type Anomaly, type Incident, type Topology, PrismaClient } from '@prisma/client';
type UUID = string;
import { randomUUID } from 'crypto';
import type { FastifyBaseLogger } from 'fastify';
import {
    INCIDENT_LOOKBACK_WINDOW_MS,
    INCIDENT_HARD_MAX_DURATION_MS,
    INCIDENT_SETTLE_DELAY_MS
} from '../../constants/timerConstants.js';
import { triggerIncidentAnalysis } from './IncidentAnalysisTrigger.js';
import { servicesMatch, computeInfraSimilarity } from './normalizer.js';

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
        
        // 2. Query: Find active incidents (OPEN, PROCESSING, PENDING_REVIEW) within lookback window
        const lookbackLimit = new Date(anomaly.detected_at.getTime() - INCIDENT_LOOKBACK_WINDOW_MS);
        const activeIncidents = await this.prisma.incident.findMany({
            where: {
                status: { in: ['OPEN', 'PROCESSING', 'PENDING_REVIEW'] },
                updated_at: {
                    gt: lookbackLimit
                },
                ...(anomaly.org_id ? { OR: [{ org_id: anomaly.org_id }, { org_id: null }] } : {})
            },
            include: {
                anomalies: {
                    select: {
                        id: true,
                        service_name: true,
                        metric_name: true,
                        raw_payload: true,
                        detected_at: true,
                    },
                    take: 20,
                    orderBy: { detected_at: 'desc' }
                }
            },
            orderBy: {
                started_at: 'asc' // Prioritize oldest active incident to preserve the original root cause
            }
        });

        // 3. Coordinate: Determine which incident (if any) this anomaly belongs to
        for (const incident of activeIncidents) {
            // Case A: Existing service re-fires inside this incident (exact or canonical match)
            const hasService = incident.services_affected.some((s) => servicesMatch(s, anomaly.service_name));
            if (hasService) {
                this.logger?.info(
                    `[IC] Service "${anomaly.service_name}" re-fired in incident ${incident.id}. Linking to incident.`
                );
                await this.prisma.anomaly.update({
                    where: { id: this.anomalyId },
                    data: { incident_id: incident.id }
                });
                await this.handleIncidentJoined(incident, anomaly.service_name);
                return;
            }

            // Case B: New service — multi-signal resolution (topology, infra, temporal)
            const resolution = await this.resolveIncident(anomaly, incident);
            if (resolution.matched) {
                this.logger?.info(
                    `[IC] Service "${anomaly.service_name}" joined incident ${incident.id} via ${resolution.layer} (score: ${resolution.score}).`
                );
                await this.pushIncidentServices(incident, anomaly.service_name);
                await this.handleIncidentJoined(incident, anomaly.service_name);
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
     * Handles state-specific updates when a service joins an incident.
     */
    private async handleIncidentJoined(incident: Incident, serviceName: string) {
        if (incident.status === 'OPEN') {
            this.resetSettleTimer(incident.id, incident.started_at);
        } else if (incident.status === 'PROCESSING') {
            this.logger?.info(
                `[IC] Incident ${incident.id} is PROCESSING. Appended anomaly ${this.anomalyId} (${serviceName}) to incident context.`
            );
        } else if (incident.status === 'PENDING_REVIEW') {
            this.logger?.info(
                `[IC] Incident ${incident.id} is PENDING_REVIEW. Appended anomaly ${this.anomalyId} (${serviceName}) to existing incident blast radius.`
            );
            if (!incident.blast_radius.includes(serviceName)) {
                await this.prisma.incident.update({
                    where: { id: incident.id },
                    data: {
                        blast_radius: [...incident.blast_radius, serviceName],
                    }
                });
            }
        }
    }

    /**
     * Multi-signal incident resolution strategy.
     * Combines:
     *   1. Topology graph (direct + transitive k-hop reachability)
     *   2. Shared infrastructure context (namespace, cluster, node/host)
     *   3. Temporal burst proximity (<3 mins, <7 mins)
     */
    private async resolveIncident(
        anomaly: Anomaly,
        incident: Incident & { anomalies: any[] }
    ): Promise<{ matched: boolean; layer: string; score: number }> {
        const serviceName = anomaly.service_name;

        // Fetch topology edges scoped to org if available
        const topologyRows = await this.prisma.topology.findMany({
            where: incident.org_id ? { OR: [{ org_id: incident.org_id }, { org_id: null }] } : {}
        });

        // ── Signal 1: Topology (direct + transitive k-hop BFS) ────────────────
        if (topologyRows.length > 0) {
            const distance = this.computeTopologyDistance(serviceName, incident.services_affected, topologyRows);
            if (distance !== null) {
                if (distance <= 1) {
                    return { matched: true, layer: 'topology-direct', score: 1.0 };
                } else if (distance <= 2) {
                    return { matched: true, layer: 'topology-transitive-2hop', score: 0.85 };
                } else if (distance <= 3) {
                    return { matched: true, layer: 'topology-transitive-3hop', score: 0.70 };
                }
            }
        }

        // ── Signal 2: Infrastructure Context (namespace, cluster, node) ────────
        let maxInfraScore = 0;
        const incomingPayload = (anomaly.raw_payload as any)?.labels || anomaly.raw_payload || {};
        for (const existingAnomaly of incident.anomalies) {
            const existingPayload = (existingAnomaly.raw_payload as any)?.labels || existingAnomaly.raw_payload || {};
            const infraScore = computeInfraSimilarity(incomingPayload, existingPayload);
            if (infraScore > maxInfraScore) {
                maxInfraScore = infraScore;
            }
        }

        // ── Signal 3: Temporal Proximity ───────────────────────────────────────
        const timeDiffMs = Math.abs(anomaly.detected_at.getTime() - incident.updated_at.getTime());
        const isWithinShortBurst = timeDiffMs <= 3 * 60 * 1000; // <= 3 minutes
        const isWithinMediumBurst = timeDiffMs <= 7 * 60 * 1000; // <= 7 minutes

        // Case A: Strong infra match + within medium burst window -> merge into incident
        if (maxInfraScore >= 0.5 && isWithinMediumBurst) {
            return {
                matched: true,
                layer: 'infra-shared-context',
                score: 0.6 + maxInfraScore * 0.3
            };
        }

        // Case B: No topology defined at all -> fall back to temporal correlation
        if (topologyRows.length === 0) {
            this.logger?.warn(
                `[IC] No topology defined. Grouping "${serviceName}" into incident ${incident.id} via temporal correlation.`
            );
            return { matched: true, layer: 'temporal-correlation', score: 0.6 };
        }

        // Case C: Topology exists but this edge was omitted:
        // If it's a tight simultaneous burst (< 3 minutes) during an active OPEN incident storm,
        // prevent alert fragmentation by absorbing into the active incident.
        if (isWithinShortBurst && incident.status === 'OPEN') {
            this.logger?.info(
                `[IC] Topology present but edge missing. Grouping "${serviceName}" into incident ${incident.id} via temporal burst (<3m).`
            );
            return { matched: true, layer: 'temporal-burst-fallback', score: 0.55 };
        }

        // Isolated alert (no edge, no shared infra, outside short burst window)
        return { matched: false, layer: 'none', score: 0 };
    }

    /**
     * Computes the shortest graph distance between sourceService and any of targetServices
     * using BFS up to 3 hops. Handles canonical name matching.
     */
    private computeTopologyDistance(
        sourceService: string,
        targetServices: string[],
        rows: Topology[]
    ): number | null {
        const adj = new Map<string, Set<string>>();
        const allNodes = new Set<string>();

        const addEdge = (u: string, v: string) => {
            allNodes.add(u);
            allNodes.add(v);
            if (!adj.has(u)) adj.set(u, new Set());
            if (!adj.has(v)) adj.set(v, new Set());
            adj.get(u)!.add(v);
            adj.get(v)!.add(u);
        };

        for (const row of rows) {
            addEdge(row.upstream_service, row.downstream_service);
        }

        // Resolve source service against graph nodes using exact or fuzzy match
        let resolvedSource: string | null = null;
        if (allNodes.has(sourceService)) {
            resolvedSource = sourceService;
        } else {
            for (const node of allNodes) {
                if (servicesMatch(node, sourceService)) {
                    resolvedSource = node;
                    break;
                }
            }
        }

        if (!resolvedSource) return null;

        // Resolve targets against graph nodes
        const resolvedTargets = new Set<string>();
        for (const target of targetServices) {
            if (allNodes.has(target)) {
                resolvedTargets.add(target);
            } else {
                for (const node of allNodes) {
                    if (servicesMatch(node, target)) {
                        resolvedTargets.add(node);
                    }
                }
            }
        }

        if (resolvedTargets.size === 0) return null;
        if (resolvedTargets.has(resolvedSource)) return 0;

        // BFS up to 3 hops
        const visited = new Set<string>([resolvedSource]);
        const queue: Array<{ node: string; dist: number }> = [{ node: resolvedSource, dist: 0 }];

        while (queue.length > 0) {
            const { node, dist } = queue.shift()!;
            if (dist >= 3) continue;

            const neighbors = adj.get(node) || new Set();
            for (const neighbor of neighbors) {
                if (resolvedTargets.has(neighbor)) {
                    return dist + 1;
                }
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ node: neighbor, dist: dist + 1 });
                }
            }
        }

        return null;
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
        const updatedServices = incident.services_affected.some((s) => servicesMatch(s, serviceName))
            ? incident.services_affected
            : [...incident.services_affected, serviceName];

        const updatedBlast = incident.blast_radius.some((s) => servicesMatch(s, serviceName))
            ? incident.blast_radius
            : [...incident.blast_radius, serviceName];

        // 1. Update the incident services list and timing window
        const updatedIncident = await this.prisma.incident.update({
            where: { id: incident.id },
            data: {
                services_affected: updatedServices,
                blast_radius: updatedBlast,
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
                org_id: anomaly.org_id,
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
