import * as path from "path";
import { parseTopology } from "../shared/topology/parser";
import { TopologyGraph } from "../shared/topology";

// Prisma client import — adjust path once @prisma/client is generated
// import { PrismaClient } from "@prisma/client";

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
    const edges: Array<{ upstream_service: string; downstream_service: string }> = [];

    for (const node of graph.services.values()) {
        for (const upstreamId of node.dependsOn) {
            // depends_on means: node CALLS upstreamId
            // edge direction: upstreamId (upstream) → node.id (downstream)
            edges.push({
                upstream_service: upstreamId,
                downstream_service: node.id,
            });
        }
    }

    // ── Step 3: Upsert into Prisma topology table ─────────────────────────────
    // Uncomment and wire PrismaClient once DB connection is confirmed stable.
    //
    // const prisma = new PrismaClient();
    // try {
    //     for (const edge of edges) {
    //         await prisma.topology.upsert({
    //             where: {
    //                 upstream_service_downstream_service: {
    //                     upstream_service: edge.upstream_service,
    //                     downstream_service: edge.downstream_service,
    //                 },
    //             },
    //             update: {},  // nothing to update — the edge itself is the fact
    //             create: edge,
    //         });
    //     }
    // } finally {
    //     await prisma.$disconnect();
    // }

    // ── Step 4: Log summary ───────────────────────────────────────────────────
    console.log(`[startup] Topology loaded: ${serviceCount} services, ${edges.length} edges`);

    for (const node of graph.services.values()) {
        const upstream =
            node.dependsOn.length > 0 ? `depends on [${node.dependsOn.join(", ")}]` : "root service (no dependencies)";
        console.log(`  • ${node.displayName} (${node.id}) — ${upstream}`);
    }

    return graph;
}
