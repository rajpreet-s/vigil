import * as path from "path";
import { parseTopology } from "../shared/topology/parser";
import { TopologyGraph } from "../shared/topology";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Agent Startup ───────────────────────────────────────────────────────────

/**
 * Runs once when the agent process starts. Performs two actions:
 *
 * 1. Parses and validates topology YAML → builds in-memory TopologyGraph.
 *    Throws (and crashes the agent) if the YAML is invalid or has cycles.
 *    This is intentional: an agent with broken topology data is worse than
 *    one that refuses to start.
 *
 * 2. Upserts all parsed edges into the Prisma `topology` table.
 *    This keeps the DB in sync with the YAML for the audit UI.
 *    Uses the @@unique([upstream_service, downstream_service]) constraint
 *    to make upserts idempotent — safe to re-run on every restart.
 *
 * @returns The validated TopologyGraph for injection into correlate_node.
 */
export async function initTopology(): Promise<TopologyGraph> {
    const topologyPath = path.resolve(process.cwd(), "user-files", "topology", "topology.yaml");

    // ── Step 1: Parse & validate (fail-fast) ─────────────────────────────────
    let graph: TopologyGraph;
    try {
        graph = parseTopology(topologyPath);
    } catch (err) {
        console.error("[startup] Topology validation failed. Agent cannot start.");
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
    }

    const serviceCount = graph.services.size;

    // ── Step 2: Collect all directed edges ───────────────────────────────────
    const edges: Array<{ upstream_service: string; downstream_service: string; description: string; display_name: string }> = [];

    for (const node of graph.services.values()) {
        for (const edge of node.dependsOn) {
            const upstreamId = edge.serviceId;
            // depends_on means: node CALLS upstreamId
            // edge direction: upstreamId (upstream) → node.id (downstream)
            edges.push({
                upstream_service: upstreamId,
                downstream_service: node.id,
                description: edge.description ?? `Dependency: ${node.displayName} expects ${upstreamId} to be healthy.`,
                display_name: node.displayName,
            });
        }
    }

    // ── Step 3: Upsert into Prisma topology table ─────────────────────────────
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter } as any);
    try {
        // First upsert all services
        for (const node of graph.services.values()) {
            await prisma.service.upsert({
                where: { name: node.id },
                update: { display_name: node.displayName },
                create: { name: node.id, display_name: node.displayName },
            });
        }

        // Then upsert all topology edges
        for (const edge of edges) {
            await prisma.topology.upsert({
                where: {
                    upstream_service_downstream_service: {
                        upstream_service: edge.upstream_service,
                        downstream_service: edge.downstream_service,
                    },
                },
                update: {
                    description: edge.description,
                    display_name: edge.display_name,
                }, 
                create: edge,
            });
        }
    } finally {
        await prisma.$disconnect();
    }

    // ── Step 4: Log summary ───────────────────────────────────────────────────
    console.log(`[startup] Topology loaded: ${serviceCount} services, ${edges.length} edges`);

    for (const node of graph.services.values()) {
        const upstream =
            node.dependsOn.length > 0 
                ? `depends on [${node.dependsOn.map(d => d.serviceId).join(", ")}]` 
                : "root service (no dependencies)";
        console.log(`  • ${node.displayName} (${node.id}) — ${upstream}`);
    }

    return graph;
}
