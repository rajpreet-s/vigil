import { describe, it, expect } from "vitest";
import {
    buildCausalTimeline,
    buildCausalTimelineWithoutTopology,
    pickRootCause,
    buildDeployCorrelation,
} from "./correlate_node.js";
import { TopologyGraphImpl } from "../../shared/topology/graph.js";
import type { ServiceNode } from "../../shared/topology/types.js";
import type { Anomaly, DeployEvent } from "@prisma/client";

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Builds a TopologyGraphImpl from a compact edge list.
 * edges: [caller, callee] — "caller depends on callee"
 */
function makeGraph(edges: [string, string][]): TopologyGraphImpl {
    const services = new Map<string, ServiceNode>();

    const getOrCreate = (id: string): ServiceNode => {
        if (!services.has(id)) {
            services.set(id, {
                id,
                displayName: id,
                dependsOn: [],
                dependents: [],
                prometheusLabels: {},
            });
        }
        return services.get(id)!;
    };

    for (const [caller, callee] of edges) {
        const callerNode = getOrCreate(caller);
        const calleeNode = getOrCreate(callee);
        callerNode.dependsOn.push({ serviceId: callee });
        calleeNode.dependents.push(caller);
    }

    return new TopologyGraphImpl(services);
}

/** Minimal valid Anomaly stub. Only service_name and detected_at are used. */
function anomaly(service: string, detectedAt: Date): Anomaly {
    return {
        id: `${service}-${detectedAt.getTime()}`,
        metric_name: "error_rate",
        service_name: service,
        severity: "HIGH",
        detected_at: detectedAt,
        raw_payload: {},
        incident_id: "inc-1",
        processed: false,
    } as unknown as Anomaly;
}

// Topology used across most tests:
//   nginx → api → postgres
//               └→ redis
// "→" means "calls" / "depends on"
const T0 = new Date("2024-01-01T10:00:00Z");
const T1 = new Date("2024-01-01T10:01:00Z");
const T2 = new Date("2024-01-01T10:02:00Z");
const T3 = new Date("2024-01-01T10:03:00Z");

// ─── buildCausalTimeline ──────────────────────────────────────────────────────

describe("buildCausalTimeline", () => {
    it("returns empty array when rawAnomalies is empty", () => {
        const graph = makeGraph([["nginx", "api"], ["api", "postgres"]]);
        expect(buildCausalTimeline([], graph)).toEqual([]);
    });

    it("keeps all anomalies forming a single connected chain, sorted oldest first", () => {
        const graph = makeGraph([["nginx", "api"], ["api", "postgres"]]);

        const raw = [
            anomaly("nginx",    T2),
            anomaly("api",      T1),
            anomaly("postgres", T0),
        ];

        const result = buildCausalTimeline(raw, graph);
        expect(result.map((a) => a.service_name)).toEqual(["postgres", "api", "nginx"]);
    });

    it("drops an anomaly that has no edge to any other anomalous service", () => {
        const graph = makeGraph([
            ["nginx",          "api"],
            ["api",            "postgres"],
            ["background_job", "some_queue"],
        ]);

        const raw = [
            anomaly("nginx",          T1),
            anomaly("api",            T0),
            anomaly("background_job", T0), // isolated — should be dropped
        ];

        const result = buildCausalTimeline(raw, graph);
        const services = result.map((a) => a.service_name);

        expect(services).toContain("nginx");
        expect(services).toContain("api");
        expect(services).not.toContain("background_job");
    });

    it("sorts survivors by detected_at ascending", () => {
        const graph = makeGraph([["nginx", "api"], ["api", "postgres"]]);
        const raw = [anomaly("nginx", T3), anomaly("postgres", T0), anomaly("api", T2)];

        const result = buildCausalTimeline(raw, graph);
        const times = result.map((a) => a.detected_at.getTime());
        expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it("handles diamond dependency without duplicates", () => {
        const graph = makeGraph([
            ["nginx", "api-a"],
            ["nginx", "api-b"],
            ["api-a", "postgres"],
            ["api-b", "postgres"],
        ]);

        const raw = [
            anomaly("nginx",    T2),
            anomaly("api-a",    T1),
            anomaly("api-b",    T1),
            anomaly("postgres", T0),
        ];

        const result = buildCausalTimeline(raw, graph);
        expect(result.map((a) => a.service_name).sort()).toEqual(
            ["api-a", "api-b", "nginx", "postgres"]
        );
    });

    it("returns empty when only one anomaly exists (no neighbours to connect to)", () => {
        const graph = makeGraph([]);
        expect(buildCausalTimeline([anomaly("orphan", T0)], graph)).toEqual([]);
    });

    it("keeps a service with no upstream when its downstream is anomalous", () => {
        // postgres has no upstream; api calls postgres and is also anomalous
        const graph = makeGraph([["api", "postgres"]]);
        const raw = [anomaly("postgres", T0), anomaly("api", T1)];

        const result = buildCausalTimeline(raw, graph);
        expect(result.map((a) => a.service_name)).toContain("postgres");
        expect(result.map((a) => a.service_name)).toContain("api");
    });
});

// ─── buildCausalTimelineWithoutTopology ──────────────────────────────────────

describe("buildCausalTimelineWithoutTopology", () => {
    it("returns all anomalies sorted by detected_at ascending", () => {
        const raw = [anomaly("nginx", T2), anomaly("postgres", T0), anomaly("api", T1)];
        const result = buildCausalTimelineWithoutTopology(raw);
        expect(result.map((a) => a.service_name)).toEqual(["postgres", "api", "nginx"]);
    });

    it("does not drop any anomalies, even isolated ones", () => {
        const raw = [
            anomaly("nginx",          T1),
            anomaly("background_job", T0),
        ];
        const result = buildCausalTimelineWithoutTopology(raw);
        expect(result).toHaveLength(2);
    });

    it("returns empty array when rawAnomalies is empty", () => {
        expect(buildCausalTimelineWithoutTopology([])).toEqual([]);
    });

    it("does not mutate the original array", () => {
        const raw = [anomaly("nginx", T2), anomaly("api", T0)];
        const copy = [...raw];
        buildCausalTimelineWithoutTopology(raw);
        expect(raw.map((a) => a.service_name)).toEqual(copy.map((a) => a.service_name));
    });
});

// ─── pickRootCause ────────────────────────────────────────────────────────────

describe("pickRootCause", () => {
    const graph = makeGraph([["nginx", "api"], ["api", "postgres"]]);

    it("returns null candidate and LOW when rawAnomalies is empty", () => {
        const result = pickRootCause([], [], graph);
        expect(result).toEqual({ candidate: null, confidence: "LOW" });
    });

    it("returns the single anomaly as candidate with MEDIUM confidence", () => {
        const single = anomaly("postgres", T0);
        const result = pickRootCause([single], [single], graph);
        expect(result.candidate?.service_name).toBe("postgres");
        expect(result.confidence).toBe("MEDIUM");
    });

    it("returns earliest anomaly with LOW confidence when no topology", () => {
        const raw = [anomaly("nginx", T2), anomaly("api", T1), anomaly("postgres", T0)];
        const result = pickRootCause(raw, raw, null);
        expect(result.candidate?.service_name).toBe("postgres");
        expect(result.confidence).toBe("LOW");
    });

    it("returns earliest raw anomaly with MEDIUM confidence when timeline is empty but topology exists", () => {
        // Two unrelated services — neither has an anomalous neighbour, so
        // buildCausalTimeline would have returned []. Simulate that here.
        const raw = [anomaly("svc-a", T1), anomaly("svc-b", T0)];
        const emptyTimeline: Anomaly[] = [];
        const result = pickRootCause(emptyTimeline, raw, graph);
        expect(result.candidate?.service_name).toBe("svc-b"); // earliest
        expect(result.confidence).toBe("MEDIUM");
    });

    it("returns HIGH confidence when candidate has no anomalous upstream", () => {
        // postgres has no upstream. It fires first. → HIGH.
        const raw = [
            anomaly("nginx",    T2),
            anomaly("api",      T1),
            anomaly("postgres", T0),
        ];
        const timeline = buildCausalTimeline(raw, graph);
        const result = pickRootCause(timeline, raw, graph);

        expect(result.candidate?.service_name).toBe("postgres");
        expect(result.confidence).toBe("HIGH");
    });

    it("returns MEDIUM confidence when candidate has an anomalous upstream", () => {
        // api fires first within the connected chain, but postgres (its
        // upstream) is also anomalous — so the true root might be postgres.
        // Simulate this by making api appear earliest but postgres also firing.
        const raw = [
            anomaly("api",      T0), // earliest in connected chain
            anomaly("postgres", T1), // upstream of api — also anomalous
            anomaly("nginx",    T2),
        ];
        const timeline = buildCausalTimeline(raw, graph);
        const result = pickRootCause(timeline, raw, graph);

        // api is [0] in the timeline, but postgres is anomalous upstream
        expect(result.candidate?.service_name).toBe("api");
        expect(result.confidence).toBe("MEDIUM");
    });
});

// ─── buildDeployCorrelation ───────────────────────────────────────────────────

/** Minimal DeployEvent stub. */
function deploy(
    service: string,
    deployedAt: Date,
    overrides: Partial<DeployEvent> = {}
): DeployEvent {
    return {
        id: `deploy-${service}-${deployedAt.getTime()}`,
        service_name: service,
        pr_title: "fix: patch critical bug",
        branch: "main",
        author: "dev",
        commit_sha: "abc123",
        files_changed: JSON.stringify(["src/index.ts"]),
        deployed_at: deployedAt,
        ...overrides,
    } as unknown as DeployEvent;
}

describe("buildDeployCorrelation", () => {
    it("returns null when recentDeployments is empty", () => {
        expect(buildDeployCorrelation([anomaly("api", T2)], [])).toBeNull();
    });

    it("returns null when deploy is 31 minutes before anomaly (outside window)", () => {
        const deployTime = new Date(T2.getTime() - 31 * 60 * 1000);
        expect(buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime)]
        )).toBeNull();
    });

    it("returns null when deploy happened after the anomaly", () => {
        const deployTime = new Date(T2.getTime() + 5 * 60 * 1000);
        expect(buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime)]
        )).toBeNull();
    });

    it("returns null when deploy service does not match anomaly service", () => {
        expect(buildDeployCorrelation(
            [anomaly("nginx", T2)],
            [deploy("api", T1)]  // different service
        )).toBeNull();
    });

    it("returns a non-null string when deploy is inside the 30-minute window", () => {
        const deployTime = new Date(T2.getTime() - 5 * 60 * 1000);
        const result = buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime)]
        );
        expect(result).not.toBeNull();
    });

    it("includes service, PR title, author, commit SHA, and lag in the output", () => {
        const deployTime = new Date(T2.getTime() - 8 * 60 * 1000); // 8 min before
        const result = buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime, {
                pr_title: "feat: new endpoint",
                author: "Rajpreet Singh",
                commit_sha: "deadbeef",
            })]
        )!;

        expect(result).toContain("api");
        expect(result).toContain("feat: new endpoint");
        expect(result).toContain("Rajpreet Singh");
        expect(result).toContain("deadbeef");
        expect(result).toContain("8m 0s after deploy");
    });

    it("formats a sub-minute lag as seconds only", () => {
        const deployTime = new Date(T2.getTime() - 45 * 1000); // 45 seconds
        const result = buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime)]
        )!;
        expect(result).toContain("45s after deploy");
    });

    it("handles files_changed already parsed as a real array (not a JSON string)", () => {
        const deployTime = new Date(T2.getTime() - 5 * 60 * 1000);
        const result = buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime, {
                files_changed: ["src/server.ts", "src/db.ts"] as unknown as string,
            })]
        )!;
        expect(result).toContain("src/server.ts");
        expect(result).toContain("src/db.ts");
    });

    it("produces one correlation block per matching deploy across multiple services", () => {
        const raw = [anomaly("api", T1), anomaly("nginx", T2)];
        const deps = [
            deploy("api",   new Date(T1.getTime() - 10 * 60 * 1000), { pr_title: "fix: api patch" }),
            deploy("nginx", new Date(T2.getTime() - 20 * 60 * 1000), { pr_title: "fix: nginx config" }),
        ];

        const result = buildDeployCorrelation(raw, deps)!;
        expect(result).toContain("fix: api patch");
        expect(result).toContain("fix: nginx config");
        expect(result.split("[DEPLOY CORRELATION]").length - 1).toBe(2);
    });

    it("accepts a deploy at exactly the 30-minute boundary", () => {
        const deployTime = new Date(T2.getTime() - 30 * 60 * 1000); // exactly 30 min
        const result = buildDeployCorrelation(
            [anomaly("api", T2)],
            [deploy("api", deployTime)]
        );
        expect(result).not.toBeNull();
    });
});
