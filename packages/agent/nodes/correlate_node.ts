import { AgentStateSchema } from "../agentStateSchema.js";
import { logger } from "../../shared/index.js";
import { Anomaly, DeployEvent } from "@prisma/client";
import { TopologyGraph } from "../../shared/topology/types.js";

const nodeLogger = logger.child({ context: "correlate_node" });

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * Topology-aware timeline.
 *
 * Filters rawAnomalies to only those whose service shares at least one
 * topology edge with another anomalous service, then sorts by detected_at asc.
 * Isolated anomalies (no anomalous neighbour in the graph) are dropped —
 * they fired by coincidence with no dependency path to the incident.
 */
export function buildCausalTimeline(
    rawAnomalies: Anomaly[],
    topology: TopologyGraph
): Anomaly[] {
    const anomalousServices = new Set<string>(rawAnomalies.map((a) => a.service_name));

    const connected = rawAnomalies.filter((anomaly) => {
        const hasAnomalousUpstream = topology
            .getUpstream(anomaly.service_name)
            .some((s) => anomalousServices.has(s));

        const hasAnomalousDownstream = topology
            .getDownstream(anomaly.service_name)
            .some((s) => anomalousServices.has(s));

        return hasAnomalousUpstream || hasAnomalousDownstream;
    });

    return connected.sort((a, b) => a.detected_at.getTime() - b.detected_at.getTime());
}

/**
 * Topology-free timeline.
 *
 * Used when no topology graph is available. We cannot reason about dependency
 * edges so we include ALL raw anomalies sorted purely by time. Nothing is
 * dropped — the LLM in rca_node must do the structural reasoning.
 */
export function buildCausalTimelineWithoutTopology(rawAnomalies: Anomaly[]): Anomaly[] {
    return [...rawAnomalies].sort((a, b) => a.detected_at.getTime() - b.detected_at.getTime());
}

/**
 * Picks the root cause candidate and computes confidence.
 *
 * Both values are derived together so the decision tree only runs once.
 *
 * Decision tree:
 *
 *  No anomalies                          → candidate: null,    confidence: LOW
 *  Single anomaly                        → candidate: the one, confidence: MEDIUM
 *  No topology (multiple anomalies)      → candidate: earliest, confidence: LOW
 *  Topology + empty connected chain      → candidate: earliest raw, confidence: MEDIUM
 *  Topology + chain, no anomalous upstream on candidate → confidence: HIGH
 *  Topology + chain, anomalous upstream exists          → confidence: MEDIUM
 */
export function pickRootCause(
    causalTimeline: Anomaly[],
    rawAnomalies: Anomaly[],
    topology: TopologyGraph | null
): { candidate: Anomaly | null; confidence: "HIGH" | "MEDIUM" | "LOW" } {
    if (rawAnomalies.length === 0) {
        return { candidate: null, confidence: "LOW" };
    }

    // Single anomaly — trivially the root regardless of topology.
    // MEDIUM: only one data point; LLM can still reason about it.
    if (rawAnomalies.length === 1) {
        return { candidate: rawAnomalies[0], confidence: "MEDIUM" };
    }

    // No topology — all we have is time ordering. Pick the earliest anomaly
    // but flag LOW confidence so rca_node knows it must work harder.
    if (!topology) {
        const earliest = [...rawAnomalies].sort(
            (a, b) => a.detected_at.getTime() - b.detected_at.getTime()
        )[0];
        return { candidate: earliest, confidence: "LOW" };
    }

    // Topology exists but connected chain is empty — every anomaly was
    // isolated in the graph (no anomalous neighbours). Fall back to the
    // earliest raw anomaly. MEDIUM: we have topology context but couldn't
    // connect any services structurally.
    if (causalTimeline.length === 0) {
        const earliest = [...rawAnomalies].sort(
            (a, b) => a.detected_at.getTime() - b.detected_at.getTime()
        )[0];
        return { candidate: earliest, confidence: "MEDIUM" };
    }

    // Normal case: topology + connected chain.
    // causalTimeline[0] is the earliest service in the causal chain.
    // Check if anything upstream of it is also anomalous.
    const candidate = causalTimeline[0];

    const anomalousServices = new Set<string>(rawAnomalies.map((a) => a.service_name));
    const hasAnomalousUpstream = topology
        .getUpstream(candidate.service_name)
        .some((s) => anomalousServices.has(s));

    if (!hasAnomalousUpstream) {
        // Earliest in the chain AND nothing upstream is anomalous.
        // This service can't blame anyone — strongest possible signal.
        return { candidate, confidence: "HIGH" };
    } else {
        // Earliest in the chain but something upstream is also anomalous.
        // The true root may sit further up; LLM should investigate the full
        // causalTimeline.
        return { candidate, confidence: "MEDIUM" };
    }
}

// ─── Deploy correlation ───────────────────────────────────────────────────────

/**
 * Checks whether any anomaly in the incident has a deploy on its service
 * within 30 minutes before its detected_at timestamp.
 *
 * When a match is found, returns a structured plain-text summary designed to
 * be embedded directly into the rca_node LLM prompt. The format surfaces the
 * fields the LLM needs most: what changed (PR title, files), who deployed it,
 * and the exact time gap between deploy and anomaly.
 *
 * Returns null when no deploy correlates with any anomaly in the window.
 */
export function buildDeployCorrelation(
    rawAnomalies: Anomaly[],
    recentDeployments: DeployEvent[]
): string | null {
    const WINDOW_MS = 30 * 60 * 1000; // 30 minutes

    const hits: string[] = [];

    for (const anomaly of rawAnomalies) {
        const anomalyTime = anomaly.detected_at.getTime();
        const windowStart = anomalyTime - WINDOW_MS;

        // Find all deploys on this service that landed inside the window.
        // A deploy must precede the anomaly (deployed_at < detected_at) to be
        // causal — a deploy that happened after can't have caused it.
        const matchingDeploys = recentDeployments.filter(
            (d) =>
                d.service_name === anomaly.service_name &&
                d.deployed_at.getTime() >= windowStart &&
                d.deployed_at.getTime() < anomalyTime
        );

        for (const deploy of matchingDeploys) {
            const lagSeconds = Math.round(
                (anomalyTime - deploy.deployed_at.getTime()) / 1000
            );
            const lagMin = Math.floor(lagSeconds / 60);
            const lagSec = lagSeconds % 60;
            const lagLabel = lagMin > 0
                ? `${lagMin}m ${lagSec}s`
                : `${lagSec}s`;

            // files_changed is stored as JSON (string[]) — parse it safely.
            let files: string[] = [];
            try {
                const raw = deploy.files_changed;
                files = Array.isArray(raw) ? raw as string[] : JSON.parse(raw as string);
            } catch {
                files = [];
            }

            const filesSummary = files.length > 0
                ? files.join(", ")
                : "(no file list recorded)";

            hits.push(
                `[DEPLOY CORRELATION]\n` +
                `  Service:       ${deploy.service_name}\n` +
                `  PR:            ${deploy.pr_title ?? "(no title)"}\n` +
                `  Branch:        ${deploy.branch}\n` +
                `  Author:        ${deploy.author}\n` +
                `  Commit:        ${deploy.commit_sha}\n` +
                `  Deployed at:   ${deploy.deployed_at.toISOString()}\n` +
                `  Anomaly at:    ${anomaly.detected_at.toISOString()}\n` +
                `  Lag:           ${lagLabel} after deploy\n` +
                `  Files changed: ${filesSummary}`
            );
        }
    }

    if (hits.length === 0) return null;

    return hits.join("\n\n");
}

// ─── correlate_node ─────────────────────────────────────────────────────────

export async function correlate_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const { rawAnomalies, recentDeployments, topology } = state;

    nodeLogger.info(
        { count: rawAnomalies.length, anomaly_ids: rawAnomalies.map((a) => a.id) },
        "correlate_node: starting anomaly correlation"
    );

    // ── Build causal timeline ─────────────────────────────────────────────────
    // When topology is unavailable, degrade gracefully instead of crashing:
    // include all anomalies sorted by time and signal LOW confidence so the
    // downstream rca_node knows it must do heavier LLM reasoning.
    let causalTimeline: Anomaly[];

    if (topology) {
        causalTimeline = buildCausalTimeline(rawAnomalies, topology);

        nodeLogger.info(
            {
                raw: rawAnomalies.length,
                connected: causalTimeline.length,
                dropped: rawAnomalies.length - causalTimeline.length,
            },
            "correlate_node: topology-aware causal timeline built"
        );
    } else {
        nodeLogger.warn(
            { count: rawAnomalies.length },
            "correlate_node: no topology — falling back to time-ordered timeline, confidence will be LOW"
        );

        causalTimeline = buildCausalTimelineWithoutTopology(rawAnomalies);
    }

    // ── Root cause candidate + confidence ─────────────────────────────────────
    const { candidate: rootCauseCandidate, confidence } = pickRootCause(
        causalTimeline,
        rawAnomalies,
        topology ?? null
    );

    // ── Deploy correlation ────────────────────────────────────────────────────
    const deployCorrelation = buildDeployCorrelation(rawAnomalies, recentDeployments);

    nodeLogger.info(
        {
            rootCauseCandidate: rootCauseCandidate?.service_name ?? null,
            confidence,
            deployCorrelation: deployCorrelation !== null ? "found" : "none",
            timeline: causalTimeline.map((a) => ({
                service: a.service_name,
                detected_at: a.detected_at,
            })),
        },
        "correlate_node: correlation complete"
    );

    return {
        causalTimeline,
        rootCauseCandidate,
        confidence,
        deployCorrelation,
    };
}