import { type Anomaly, type DeployEvent, type Topology } from '@prisma/client';
import type { TopologyGraph, ServiceNode } from '../../shared/topology/types.js';
import { TopologyGraphImpl } from '../../shared/topology/graph.js';
import { prisma } from '../prisma.js';
import { logger } from '../../shared/index.js';
import { AgentStateSchema } from '../agentStateSchema.js';
import { AgentError } from '../errors.js';

const nodeLogger = logger.child({ context: 'load_node' });

// ─── load_node ────────────────────────────────────────────────────────────────
//
// Node 1 of the incident analysis graph. Runs once per incident at graph entry.
//
// Responsibilities:
//   1. Fetch all Anomaly rows linked to this incident (SELECT FOR UPDATE SKIP
//      LOCKED) — prevents a parallel graph run from re-processing the same rows.
//   2. Build the topology graph from the topology table so every downstream node
//      can call isUpstreamOf(), getBlastRadius(), etc. without re-walking rows.
//   3. Query deploy_events for every affected service within the last 60 minutes,
//      so the correlate_node can answer "did a deploy precede this incident?"
//
// Returns only the three state slices it owns — other slices are untouched.

const DEPLOY_LOOKBACK_MS = 60 * 60 * 1000; // 60 minutes

export async function load_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const incidentId = state.incidentId;
    nodeLogger.info({ incidentId }, 'load_node: starting data fetch');

    // ── 1. Fetch anomalies (SELECT FOR UPDATE SKIP LOCKED) ───────────────────
    // Raw SQL is used here because Prisma does not expose SKIP LOCKED through
    // its high-level API. The result is cast to the Prisma Anomaly shape.
    // FATAL: without anomalies the entire graph has nothing to analyse.
    let rawAnomalies: Anomaly[];
    try {
        rawAnomalies = await prisma.$queryRaw`
            SELECT *
            FROM anomalies
            WHERE incident_id = ${incidentId}::uuid
            FOR UPDATE SKIP LOCKED
        `;
    } catch (err) {
        throw new AgentError('load', 'Failed to fetch anomalies from DB', err);
    }

    nodeLogger.info({ count: rawAnomalies.length }, 'load_node: anomalies fetched');

    // ── 2. Fetch topology graph ───────────────────────────────────────────────
    // DEGRADED: topology failure does not abort the run. Downstream nodes must
    // null-check state.topology. RCA still runs, just without graph traversal.
    let topology: TopologyGraph | null = null;
    try {
        topology = await getTopologyGraph();
    } catch (err) {
        nodeLogger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            'load_node: topology fetch failed — continuing without graph'
        );
    }

    // ── 3. Fetch recent deploy events for all affected services ───────────────
    // DEGRADED: deploy event failure skips deploy correlation, not a blocker.
    const affectedServices = [...new Set(rawAnomalies.map((a) => a.service_name))];

    const since = new Date(Date.now() - DEPLOY_LOOKBACK_MS);

    let recentDeployments: DeployEvent[] = [];
    if (affectedServices.length > 0) {
        try {
            recentDeployments = await prisma.deployEvent.findMany({
                where: {
                    service_name: { in: affectedServices },
                    deployed_at: { gte: since },
                },
                orderBy: { deployed_at: 'desc' },
            });
        } catch (err) {
            nodeLogger.warn(
                { err: err instanceof Error ? err.message : String(err) },
                'load_node: deploy events fetch failed — continuing without deploy correlation'
            );
        }
    }

    nodeLogger.info(
        { count: recentDeployments.length, since: since.toISOString() },
        'load_node: deploy events fetched'
    );

    return {
        rawAnomalies,
        topology,
        recentDeployments,
    };
}

// ─── getTopologyGraph ─────────────────────────────────────────────────────────
//
// Fetches all rows from the `topology` table and assembles a TopologyGraphImpl.
//
// Edge semantics from the DB schema:
//   upstream_service   = the service being depended upon  (e.g. "postgresql")
//   downstream_service = the service that depends on it   (e.g. "api_service")
//
// So: downstream_service.dependsOn.push(upstream_service)
//
// After building the forward graph (dependsOn) we do a second pass to compute
// the reverse graph (dependents), mirroring exactly what the YAML parser does.

async function getTopologyGraph(): Promise<TopologyGraph> {
    const rows: Topology[] = await prisma.topology.findMany();

    nodeLogger.info({ count: rows.length }, 'load_node: topology rows fetched');

    // ── Pass 1: ensure every referenced service has a node ───────────────────
    const services = new Map<string, ServiceNode>();

    const ensureNode = (id: string): void => {
        if (!services.has(id)) {
            services.set(id, {
                id,
                displayName: id, // may be overwritten below
                dependsOn: [],
                dependents: [],
                prometheusLabels: {},
            });
        }
    };

    for (const row of rows) {
        ensureNode(row.upstream_service);
        ensureNode(row.downstream_service);

        // display_name from the DB row describes the downstream service
        // (e.g. "Node.js API" for api_service). Only overwrite if provided.
        if (row.display_name) {
            services.get(row.downstream_service)!.displayName = row.display_name;
        }
    }

    // ── Pass 2: wire dependsOn edges ─────────────────────────────────────────
    for (const row of rows) {
        services.get(row.downstream_service)!.dependsOn.push({
            serviceId: row.upstream_service,
            description: row.description ?? undefined,
        });
    }

    // ── Pass 3: compute reverse graph (dependents) ───────────────────────────
    // For each service A and each B in A.dependsOn → add A to B.dependents.
    for (const node of services.values()) {
        for (const edge of node.dependsOn) {
            services.get(edge.serviceId)!.dependents.push(node.id);
        }
    }

    return new TopologyGraphImpl(services);
}
