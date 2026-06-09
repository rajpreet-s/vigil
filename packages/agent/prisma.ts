import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// ─── Shared Prisma singleton ──────────────────────────────────────────────────
// One pool + one client for the entire agent process lifetime.
// Graph nodes import `prisma` directly from this module.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter } as any);
