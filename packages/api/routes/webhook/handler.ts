import type { RouteHandler } from "fastify";
import { WebhookService } from "../../services/webhookService.js";
import type { AlertmanagerPayload, GitHubPushPayload } from "../../types/webhook.js";

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

export const handleGithubWebhook: RouteHandler<{Body: GitHubPushPayload}> = async (request, reply) => {
    const { commits, head_commit, ref } = request.body;

    // Filter: Only process push/merge events targeted at the designated deploy branch (default: main)
    const targetBranch = process.env.DEPLOY_BRANCH || "refs/heads/main";
    if (ref !== targetBranch) {
        request.log.info(
            `Ignoring GitHub webhook: push is to branch "${ref}" but target deploy branch is "${targetBranch}".`
        );
        return reply.status(200).send({
            success: true,
            message: `Ignored push event. Target branch is "${targetBranch}" but push was to "${ref}".`,
            processed: 0,
            ignored: commits.length
        });
    }

    const prisma = request.server.prisma;
    const webhookService = new WebhookService(prisma, request.log);
    let processedCount = 0;
    for (const commit of commits) {
        try {
            await webhookService.processDeployment(commit, head_commit, ref);
            processedCount++;
        } catch (err) {
            request.log.error(
                err,
                `Failed to process deployment "${commit.id || head_commit?.id || 'unknown'}" for service "${commit.author?.name || head_commit?.author?.name || 'unknown'}"`
            );
            // Continue processing other commits rather than crashing the batch
        }
    }
    return reply.status(200).send({
        success: true,
        message: `Processed deployment payload batch. Deployments registered: ${processedCount}.`,
        processed: processedCount,
        ignored: commits.length - processedCount
    });
};

