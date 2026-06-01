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

export const githubWebhookSchema: FastifySchema = {
    body: {
        type: "object",
        required: ["commits", "ref"],
        properties: {
            ref: { type: "string" },
            commits: {
                type: "array",
                items: {
                    type: "object",
                    required: ["id", "message", "timestamp", "author", "added", "removed", "modified"],
                    properties: {
                        id: { type: "string" },
                        message: { type: "string" },
                        timestamp: { type: "string" },
                        author: {
                            type: "object",
                            required: ["name"],
                            properties: {
                                name: { type: "string" }
                            },
                            additionalProperties: true
                        },
                        added: { type: "array", items: { type: "string" } },
                        removed: { type: "array", items: { type: "string" } },
                        modified: { type: "array", items: { type: "string" } }
                    },
                    additionalProperties: true
                }
            },
            head_commit: {
                type: "object",
                nullable: true,
                required: ["id", "message", "timestamp", "author"],
                properties: {
                    id: { type: "string" },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                    author: {
                        type: "object",
                        required: ["name"],
                        properties: {
                            name: { type: "string" }
                        },
                        additionalProperties: true
                    }
                },
                additionalProperties: true
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
