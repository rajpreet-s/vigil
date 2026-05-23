import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// TypeScript declaration merging to expose fastify.prisma typed globally
declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

export default fp(async (fastify) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
    }

    fastify.log.info("Connecting to PostgreSQL database...");

    // Create pg connection pool and Prisma driver adapter matching agent startup pattern
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter } as any);

    try {
        // Explicitly connect to verify connectivity during startup
        await prisma.$connect();
        fastify.log.info("Database connection established successfully.");
    } catch (err) {
        fastify.log.error(err, "Failed to connect to the database.");
        await pool.end();
        throw err;
    }

    // Decorate the fastify instance to make prisma client available globally
    fastify.decorate("prisma", prisma);

    // Gracefully clean up active database pools and clients when fastify shuts down
    fastify.addHook("onClose", async (server) => {
        server.log.info("Closing database connections...");
        try {
            await prisma.$disconnect();
            await pool.end();
            server.log.info("Database connections closed successfully.");
        } catch (err) {
            server.log.error(err, "Error during database connection teardown.");
        }
    });
});
