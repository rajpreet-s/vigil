import type { FastifyInstance } from "fastify";

/**
 * Health check endpoint registered at GET /api/health (due to /api autoload prefix).
 * Provides container platforms (Docker, Kubernetes) a way to verify service readiness
 * and test connection health to PostgreSQL.
 */
export default async function rootRoutes(fastify: FastifyInstance) {
    fastify.get(
        "/health",
        {
            schema: {
                tags: ["System"],
                description: "System diagnostics and database connection health probe.",
                response: {
                    200: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            uptime: { type: "number" },
                            timestamp: { type: "string" },
                            services: {
                                type: "object",
                                properties: {
                                    database: { type: "string" }
                                }
                            }
                        }
                    },
                    500: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            uptime: { type: "number" },
                            timestamp: { type: "string" },
                            services: {
                                type: "object",
                                properties: {
                                    database: { type: "string" }
                                }
                            },
                            error: { type: "string" }
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                // Perform a simple raw query to verify PostgreSQL network connectivity and responsiveness
                await fastify.prisma.$queryRaw`SELECT 1`;

                return reply.status(200).send({
                    status: "OK",
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    services: {
                        database: "HEALTHY"
                    }
                });
            } catch (err: any) {
                fastify.log.error(err, "Health check probe failed");

                return reply.status(500).send({
                    status: "ERROR",
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    services: {
                        database: "UNHEALTHY"
                    },
                    error: err.message || "Unknown database error"
                });
            }
        }
    );
}
