import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";

export default fp(async (fastify) => {
    // Register Helmet for secure HTTP headers with CSP configured to support Swagger UI
    await fastify.register(helmet, {
        global: true,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "validator.swagger.io"],
                connectSrc: ["'self'"],
            },
        },
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
