// ─── Topology Graph ──────────────────────────────────────────────────────────
//
// These interfaces represent the in-memory graph that the topology parser
// produces from topology.yaml. The correlate_node consumes TopologyGraph
// directly — it never re-parses the YAML.
//
// TopologyEdge (the DB-persisted edge format) lives in types.ts.
// ServiceNode / TopologyGraph (the in-memory query interface) lives here.

export interface ServiceNode {
    /** YAML key, e.g. "api_service". Used as the canonical service ID. */
    id: string;
    /** Human-readable label, surfaced in Slack decision brief output. */
    displayName: string;
    /**
     * Direct upstream dependencies — services this service calls.
     * Parsed directly from the `depends_on` list in the YAML.
     * "api_service depends on postgresql" means api_service → postgresql edge.
     */
    dependsOn: string[];
    /**
     * Direct downstream dependents — services that call THIS service.
     * Computed by the parser by inverting the depends_on graph.
     * Not present in the YAML; derived automatically.
     */
    dependents: string[];
    /**
     * How this service appears in Prometheus metric labels.
     * Used by findByPrometheusLabel to resolve metric stream → ServiceNode.
     * Example: { job: "node_api", service: "api" }
     */
    prometheusLabels: Record<string, string>;
}

export interface TopologyGraph {
    /** All services keyed by their YAML ID. */
    services: Map<string, ServiceNode>;

    /**
     * Returns the direct upstream dependencies of serviceId.
     * i.e. services that serviceId calls.
     * Equivalent to serviceId.dependsOn.
     */
    getUpstream(serviceId: string): string[];

    /**
     * Returns the direct downstream dependents of serviceId.
     * i.e. services that call serviceId.
     * Equivalent to serviceId.dependents.
     */
    getDownstream(serviceId: string): string[];

    /**
     * Returns true if service `a` is anywhere in the upstream chain of `b`.
     * Used by correlate_node to confirm causal direction:
     *   isUpstreamOf("postgresql", "nginx") → true
     *   isUpstreamOf("nginx", "postgresql") → false
     */
    isUpstreamOf(a: string, b: string): boolean;

    /**
     * Returns all services transitively downstream of serviceId, in BFS order
     * (closest dependents first). Used to compute blast radius of an incident.
     */
    getBlastRadius(serviceId: string): string[];

    /**
     * Resolves a Prometheus label key/value pair to the owning ServiceNode.
     * Returns null if no service matches.
     * Example: findByPrometheusLabel("job", "node_api") → api_service node
     */
    findByPrometheusLabel(key: string, value: string): ServiceNode | null;
}
