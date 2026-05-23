import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";

export default fp(async (fastify) => {
    // Register Helmet for secure HTTP headers
    await fastify.register(helmet, {
        global: true,
        // In development or when using custom dashboards/Swagger, we can configure settings as needed
    });

    // Register CORS with configurable origin
    const corsOrigin = process.env.CORS_ORIGIN || "*";
    
    fastify.log.info(`Registering CORS with origin restriction: ${corsOrigin}`);
    
    await fastify.register(cors, {
        origin: corsOrigin === "*" ? true : corsOrigin,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
});
