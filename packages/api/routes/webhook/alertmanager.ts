import type { FastifyInstance } from "fastify";
import { alertmanagerWebhookSchema } from "./schemas.js";
import { handleAlertmanagerWebhook } from "./handler.js";

/**
 * Fastify route registration plugin for the Alertmanager webhook endpoint.
 * Due to the @fastify/autoload directory structure configuration, this route
 * is mounted under: POST /api/webhook/alertmanager
 */
export default async function alertmanagerWebhookRoutes(fastify: FastifyInstance) {
    fastify.post(
        "/alertmanager",
        {
            schema: alertmanagerWebhookSchema,
        },
        handleAlertmanagerWebhook
    );
}
