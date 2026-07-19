import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

/**
 * Swagger and Swagger UI plugin configuration.
 * Exposes Swagger API specification and rendered interactive documentation
 * at the GET /docs route.
 */
export default fp(async (fastify) => {
    // Register Swagger spec generator
    await fastify.register(swagger, {
        openapi: {
            openapi: "3.0.0",
            info: {
                title: "Vigil API Documentation",
                description: "API specifications for the Vigil agentic observability intelligence platform.",
                version: "1.0.0",
            },
            servers: [
                {
                    url: "http://localhost:8080",
                    description: "Development Server",
                },
            ],
            tags: [
                {
                    name: "System",
                    description: "System diagnostics, health checks, and platform status probes."
                },
                {
                    name: "Webhooks",
                    description: "Receivers for external webhooks (e.g., Prometheus Alertmanager, GitHub events)."
                }
            ],
        },
    });

    // Register Swagger UI renderer
    await fastify.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: false,
        },
        staticCSP: true,
    });
});
