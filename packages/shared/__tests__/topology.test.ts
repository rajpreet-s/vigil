import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { parseTopology } from "../topology/parser.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Write a YAML string to a temp file and return its path.
 * Vitest's temp dir cleanup is not needed — the OS cleans up /tmp on exit.
 */
function writeTempTopology(content: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vigil-test-"));
    const file = path.join(dir, "topology.yaml");
    fs.writeFileSync(file, content, "utf8");
    return file;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_TOPOLOGY = `
version: "1"

services:
  nginx:
    display_name: "Nginx Load Balancer"
    depends_on:
      - api_service
    prometheus_labels:
      job: "nginx"

  api_service:
    display_name: "Node.js API"
    depends_on:
      - postgresql
      - redis
    prometheus_labels:
      job: "node_api"
      service: "api"

  postgresql:
    display_name: "PostgreSQL Primary"
    depends_on: []
    prometheus_labels:
      job: "postgres_exporter"

  redis:
    display_name: "Redis Cache"
    depends_on: []
    prometheus_labels:
      job: "redis_exporter"
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("parseTopology", () => {
    // ── Test 1: Valid yaml parses correctly ───────────────────────────────────
    it("parses a valid topology and populates all service fields", () => {
        const graph = parseTopology(writeTempTopology(VALID_TOPOLOGY));

        expect(graph.services.size).toBe(4);

        const api = graph.services.get("api_service");
        expect(api).toBeDefined();
        expect(api!.displayName).toBe("Node.js API");
        expect(api!.dependsOn).toEqual([
            { serviceId: "postgresql" },
            { serviceId: "redis" },
        ]);
        expect(api!.prometheusLabels).toEqual({ job: "node_api", service: "api" });

        const pg = graph.services.get("postgresql");
        expect(pg!.displayName).toBe("PostgreSQL Primary");
        expect(pg!.dependsOn).toEqual([]);
        expect(pg!.prometheusLabels).toEqual({ job: "postgres_exporter" });
    });

    // ── Test 2: dependents inverse computed correctly ─────────────────────────
    it("computes dependents correctly by inverting depends_on", () => {
        const graph = parseTopology(writeTempTopology(VALID_TOPOLOGY));

        // postgresql is depended on by api_service only
        expect(graph.services.get("postgresql")!.dependents).toEqual(["api_service"]);

        // redis is depended on by api_service only
        expect(graph.services.get("redis")!.dependents).toEqual(["api_service"]);

        // api_service is depended on by nginx only
        expect(graph.services.get("api_service")!.dependents).toEqual(["nginx"]);

        // nginx has no dependents
        expect(graph.services.get("nginx")!.dependents).toEqual([]);
    });

    // ── Test 3: getBlastRadius returns correct BFS order ─────────────────────
    it("getBlastRadius returns downstream services in BFS order", () => {
        const graph = parseTopology(writeTempTopology(VALID_TOPOLOGY));

        // postgresql → api_service → nginx
        const radius = graph.getBlastRadius("postgresql");
        expect(radius).toEqual(["api_service", "nginx"]);

        // redis → api_service → nginx
        expect(graph.getBlastRadius("redis")).toEqual(["api_service", "nginx"]);

        // nginx has no dependents
        expect(graph.getBlastRadius("nginx")).toEqual([]);
    });

    // ── Test 4: isUpstreamOf correctness ─────────────────────────────────────
    it("isUpstreamOf returns correct boolean for direct and transitive chains", () => {
        const graph = parseTopology(writeTempTopology(VALID_TOPOLOGY));

        // Direct: postgresql is directly upstream of api_service
        expect(graph.isUpstreamOf("postgresql", "api_service")).toBe(true);

        // Transitive: postgresql is transitively upstream of nginx
        expect(graph.isUpstreamOf("postgresql", "nginx")).toBe(true);

        // redis is upstream of nginx (via api_service)
        expect(graph.isUpstreamOf("redis", "nginx")).toBe(true);

        // Reverse direction: nginx is NOT upstream of postgresql
        expect(graph.isUpstreamOf("nginx", "postgresql")).toBe(false);

        // api_service is not upstream of itself
        expect(graph.isUpstreamOf("api_service", "api_service")).toBe(false);
    });

    // ── Test 5: circular dependency throws descriptive error ─────────────────
    it("throws a descriptive error when a circular dependency is detected", () => {
        const circular = `
version: "1"

services:
  service_a:
    display_name: "Service A"
    depends_on:
      - service_b
    prometheus_labels:
      job: "a"

  service_b:
    display_name: "Service B"
    depends_on:
      - service_a
    prometheus_labels:
      job: "b"
`;
        expect(() => parseTopology(writeTempTopology(circular))).toThrowError(/Circular dependency detected/);
    });

    // ── Test 7: areConnected and getTransitiveDistance ────────────────────────
    it("areConnected and getTransitiveDistance return correct hop counts", () => {
        const graph = parseTopology(writeTempTopology(VALID_TOPOLOGY));

        // 1-hop: api_service and postgresql
        expect(graph.areConnected("api_service", "postgresql")).toBe(true);
        expect(graph.getTransitiveDistance("api_service", "postgresql")).toBe(1);

        // 2-hop: nginx and postgresql (nginx -> api_service -> postgresql)
        expect(graph.areConnected("nginx", "postgresql")).toBe(true);
        expect(graph.getTransitiveDistance("nginx", "postgresql")).toBe(2);

        // Self distance
        expect(graph.getTransitiveDistance("nginx", "nginx")).toBe(0);

        // Unknown service returns null / false
        expect(graph.areConnected("nginx", "non_existent")).toBe(false);
        expect(graph.getTransitiveDistance("nginx", "non_existent")).toBeNull();
    });
});

import {
    canonicalizeServiceName,
    servicesMatch,
    extractServiceNameFromLabels,
    computeInfraSimilarity,
} from "../topology/normalizer.js";

describe("normalizer utilities", () => {
    it("canonicalizes service names by stripping prefixes and suffixes", () => {
        expect(canonicalizeServiceName("checkout-service")).toBe("checkout");
        expect(canonicalizeServiceName("prod-checkout")).toBe("checkout");
        expect(canonicalizeServiceName("api_service")).toBe("api");
        expect(canonicalizeServiceName("auth-svc")).toBe("auth");
        expect(canonicalizeServiceName("redis")).toBe("redis");
    });

    it("matches services with minor naming differences", () => {
        expect(servicesMatch("checkout", "checkout-service")).toBe(true);
        expect(servicesMatch("checkout-service", "checkout")).toBe(true);
        expect(servicesMatch("api", "api-svc")).toBe(true);
        expect(servicesMatch("auth", "billing")).toBe(false);
    });

    it("extracts candidate service name from standard Prometheus labels", () => {
        expect(extractServiceNameFromLabels({ service: "cart-service" })).toBe("cart-service");
        expect(extractServiceNameFromLabels({ app: "payment" })).toBe("payment");
        expect(extractServiceNameFromLabels({ "app.kubernetes.io/name": "catalog" })).toBe("catalog");
        expect(extractServiceNameFromLabels({ job: "checkout-worker" })).toBe("checkout-worker");
        expect(extractServiceNameFromLabels({ pod: "orders-7f89c654-x98yz" })).toBe("orders");
    });

    it("computes infrastructure similarity between alert label sets", () => {
        const labelsA = {
            namespace: "prod",
            cluster: "us-east-1",
            instance: "10.0.1.5:8080",
        };
        const labelsB = {
            namespace: "prod",
            cluster: "us-east-1",
            instance: "10.0.1.5:9090",
        };
        const labelsDiff = {
            namespace: "staging",
            cluster: "eu-west-1",
        };

        const scoreMatch = computeInfraSimilarity(labelsA, labelsB);
        expect(scoreMatch).toBe(1.0); // same namespace, cluster, and node host IP

        const scoreDiff = computeInfraSimilarity(labelsA, labelsDiff);
        expect(scoreDiff).toBe(0.0);
    });
});
