import Fastify from "fastify";
import app from "./app.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the package folder and fallback to the monorepo root
// Monorepo root and package env loader
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProduction = process.env.NODE_ENV === "production";

// Configure production-grade high-performance Pino logger options dynamically
// to satisfy strict TS configurations (e.g. exactOptionalPropertyTypes)
const getLoggerOptions = () => {
    const level = process.env.LOG_LEVEL || "info";
    if (isProduction) {
        return { level };
    }
    return {
        level,
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
            },
        },
    };
};

const server = Fastify({
    logger: getLoggerOptions(),
});

// Load all core plugins, hooks, and routes
await app(server, {});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
// Bind to 0.0.0.0 in production to accept network traffic inside Docker containers
const host = process.env.HOST || (isProduction ? "0.0.0.0" : "localhost");

const start = async () => {
    try {
        await server.listen({ port, host });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown listener for container orchestration platforms (SIGTERM/SIGINT)
const shutdown = async (signal: string) => {
    server.log.warn(`Received ${signal}. Starting graceful shutdown...`);
    
    // Set a timeout to force shutdown if graceful shutdown hangs
    const forceShutdownTimeout = setTimeout(() => {
        server.log.error("Graceful shutdown timed out. Forcing termination.");
        process.exit(1);
    }, 10000);

    try {
        // Fastify close triggers 'onClose' hooks, terminating database pools automatically
        await server.close();
        server.log.info("Server gracefully terminated. Goodbye!");
        clearTimeout(forceShutdownTimeout);
        process.exit(0);
    } catch (err) {
        server.log.error(err instanceof Error ? err : new Error(String(err)), "Error occurred during graceful shutdown:");
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await start();
