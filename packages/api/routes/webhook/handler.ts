import type { RouteHandler } from "fastify";
import { WebhookService } from "../../services/webhookService.js";
import type { AlertmanagerPayload } from "../../types/webhook.js";

/**
 * Main handler to process Alertmanager webhook payloads.
 * Validates alerts, extracts only firing alerts, and delegates logic
 * to the WebhookService for database persistence and dynamic service provisioning.
 */
export const handleAlertmanagerWebhook: RouteHandler<{ Body: AlertmanagerPayload }> = async (
    request,
    reply
) => {
    const { alerts } = request.body;
    const prisma = request.server.prisma;

    // Filter to process ONLY "firing" alerts
    const firingAlerts = alerts.filter(alert => alert.status === "firing");
    const ignoredCount = alerts.length - firingAlerts.length;

    request.log.info(
        `Received webhook. Firing alerts: ${firingAlerts.length}, Ignored (resolved): ${ignoredCount}`
    );

    // Instantiate service layer with global Prisma client and fastify request logger
    const webhookService = new WebhookService(prisma, request.log);
    let processedCount = 0;

    for (const alert of firingAlerts) {
        const serviceName = alert.labels.service;
        const alertName = alert.labels.alertname;
        
        try {
            await webhookService.processAlert(alert);
            processedCount++;
        } catch (err) {
            request.log.error(
                err,
                `Failed to process alert "${alertName}" for service "${serviceName}"`
            );
            // Continue processing other alerts rather than crashing the batch
        }
    }

    return reply.status(200).send({
        success: true,
        message: `Processed webhook payload batch. Firing anomalies registered: ${processedCount}.`,
        processed: processedCount,
        ignored: ignoredCount
    });
};

