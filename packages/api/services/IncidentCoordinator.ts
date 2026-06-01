import { type Anomaly, type Incident, PrismaClient } from '@prisma/client';
type UUID = string;
import { randomUUID } from 'crypto';
import type { FastifyBaseLogger } from 'fastify';

export class IncidentCoordinator {
    private anomalyId: UUID;
    private prisma: PrismaClient;
    private logger: FastifyBaseLogger | undefined;
    
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
        
        // 2. Query: Find if an active, non-stale OPEN incident exists for this service
        const activeIncident = await this.prisma.incident.findFirst({
            where: {
                status: 'OPEN',
                updated_at: {
                    gt: new Date(anomaly.detected_at.getTime() - 30 * 60 * 1000) // 30 minutes staleness window
                },
                services_affected: {
                    has: anomaly.service_name
                }
            }
        });

        if (activeIncident) {
            // YES — Link to existing active incident
            await this.pushIncidentServices(activeIncident, anomaly.service_name);
        } else {
            // NO — Start a new incident
            await this.createNewIncident(anomaly);
        }
    }

    private async pushIncidentServices(incident: Incident, serviceName: string) {
        // Clean deduplication: only add serviceName if it's not already listed
        const updatedServices = incident.services_affected.includes(serviceName)
            ? incident.services_affected
            : [...incident.services_affected, serviceName];

        // 1. Update the incident services list and timing window
        await this.prisma.incident.update({
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
    }

    private async createNewIncident(anomaly: Anomaly) {
        // Generate a stable UUID for both ID and thread_id matching the flow architecture
        const incidentId = randomUUID() as UUID;

        // 1. Insert new Incident row
        await this.prisma.incident.create({
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
