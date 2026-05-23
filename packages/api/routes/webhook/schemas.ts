import type { FastifySchema } from "fastify";

/**
 * JSON Schema for validation of the Alertmanager Webhook POST payload.
 * Fastify leverages native Ajv to compile this schema, ensuring high-speed
 * serialization and request validation before handlers are executed.
 */
export const alertmanagerWebhookSchema: FastifySchema = {
    body: {
        type: "object",
        required: ["alerts"],
        properties: {
            receiver: { type: "string" },
            status: { type: "string" },
            alerts: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    required: ["status", "labels", "startsAt"],
                    properties: {
                        status: { 
                            type: "string", 
                            enum: ["firing", "resolved"] 
                        },
                        labels: {
                            type: "object",
                            required: ["alertname", "service"],
                            properties: {
                                alertname: { type: "string", minLength: 1 },
                                service: { type: "string", minLength: 1 },
                                severity: { 
                                    type: "string",
                                    enum: ["warning", "critical", "WARNING", "CRITICAL", "info", "error"] 
                                }
                            },
                            additionalProperties: true
                        },
                        startsAt: { 
                            type: "string", 
                            format: "date-time" // strictly validates ISO8601 strings
                        },
                        endsAt: { type: "string" },
                        generatorURL: { type: "string" }
                    },
                    additionalProperties: true
                }
            }
        },
        additionalProperties: true
    },
    response: {
        200: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                processed: { type: "integer" },
                ignored: { type: "integer" }
            }
        }
    }
};
