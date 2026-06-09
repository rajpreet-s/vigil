import { type Anomaly, type DeployEvent, type Topology } from "@prisma/client";
import { prisma } from "../prisma.js";
import { logger } from "../../shared/index.js";
import { AgentStateSchema } from "../agentStateSchema.js";

const nodeLogger = logger.child({ context: "load_node" });

// ─── load_node ────────────────────────────────────────────────────────────────
//
// Node 1 of the incident analysis graph. Runs once per incident at graph entry.
//
// Responsibilities:
//   1. Fetch all Anomaly rows linked to this incident (SELECT FOR UPDATE SKIP
//      LOCKED) — prevents a parallel graph run from re-processing the same rows.
//   2. Query deploy_events for every affected service within the last 60 minutes,
//      so the correlate_node can answer "did a deploy precede this incident?"
//
// Returns only the three state slices it owns — other slices are untouched.

const DEPLOY_LOOKBACK_MS = 60 * 60 * 1000; // 60 minutes

export async function load_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const incidentId = state.incidentId;
    nodeLogger.info({ incidentId }, "load_node: starting data fetch");

    // ── 1. Fetch anomalies (SELECT FOR UPDATE SKIP LOCKED) ───────────────────
    // Raw SQL is used here because Prisma does not expose SKIP LOCKED through
    // its high-level API. The result is cast to the Prisma Anomaly shape.
    const rawAnomalies: Anomaly[] = await prisma.$queryRaw`
        SELECT *
        FROM anomalies
        WHERE incident_id = ${incidentId}::uuid
        FOR UPDATE SKIP LOCKED
    `;

    nodeLogger.info(
        { count: rawAnomalies.length },
        "load_node: anomalies fetched"
    );

    // ── 2. Fetch recent deploy events for all affected services ───────────────
    const affectedServices = [
        ...new Set(rawAnomalies.map((a) => a.service_name)),
    ];

    const since = new Date(Date.now() - DEPLOY_LOOKBACK_MS);

    const recentDeployments: DeployEvent[] =
        affectedServices.length > 0
            ? await prisma.deployEvent.findMany({
                  where: {
                      service_name: { in: affectedServices },
                      deployed_at: { gte: since },
                  },
                  orderBy: { deployed_at: "desc" },
              })
            : [];

    nodeLogger.info(
        { count: recentDeployments.length, since: since.toISOString() },
        "load_node: deploy events fetched"
    );

    return {
        rawAnomalies,
        recentDeployments,
    };
}
