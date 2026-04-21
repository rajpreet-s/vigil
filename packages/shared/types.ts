// ─── Branded primitives ──────────────────────────────────────────────────────
export type UUID = string & { readonly __brand: "UUID" };
export type ISOTimestamp = string & { readonly __brand: "ISOTimestamp" };

// ─── Enums ───────────────────────────────────────────────────────────────────
export const SEVERITY_LEVELS = ["CRITICAL", "WARNING"] as const;
export type Severity = typeof SEVERITY_LEVELS[number];

export const INCIDENT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "MUTED"] as const;
export type IncidentStatus = typeof INCIDENT_STATUSES[number];

// Standard Prometheus metric names used across the always-fetch checklist,
// anomaly detection rules, and RAG queries. Use MetricName everywhere a metric
// name string appears — never a raw string — to prevent silent correlation breaks.
export const STANDARD_METRICS = [
    "cpu_usage_percent",
    "memory_usage_percent",
    "request_rate",
    "error_rate",
    "network_io_bytes",
    "disk_io_bytes",
    "db_connections",
    "p99_latency_ms",
] as const;
export type MetricName = typeof STANDARD_METRICS[number];

// ─── Service configuration ───────────────────────────────────────────────────

// One Tier 1 rule stored in the Service.rules JSON column.
// Example: { metric: "cpu_usage_percent", threshold: 90, severity: "CRITICAL",
//            comparison: "gt", for_seconds: 60 }
// for_seconds prevents flapping: the metric must exceed the threshold
// continuously for this many seconds before an anomaly is written.
export interface ServiceRule {
    metric: MetricName;
    threshold: number;
    severity: Severity;
    comparison: "gt" | "lt";
    for_seconds?: number; // optional debounce window — defaults to 0 (instant)
}

// ─── Topology ────────────────────────────────────────────────────────────────

// One directed dependency edge parsed from eoia-topology.yaml.
// upstream depends_on nothing; downstream depends_on upstream.
// If upstream and downstream are both anomalous, the causal arrow is
// upstream → downstream (dependency chain propagation direction).
export interface TopologyEdge {
    upstream_service: string; // "postgresql"
    downstream_service: string; // "api_service"
    description?: string; // optional human note for the context brief
}

// ─── Deploy events ───────────────────────────────────────────────────────────

// A deploy event ingested from a GitHub webhook (push or merge).
// Surfaced by fetch_node and correlate_node near the first_bad_timestamp
// to answer "did a deploy happen just before this incident?"
export interface DeployEvent {
    id: UUID;
    service_name: string;
    pr_title?: string;
    branch: string;
    author: string;
    commit_sha: string;
    files_changed: string[]; // list of changed file paths
    deployed_at: ISOTimestamp;
}

// ─── Runbooks ────────────────────────────────────────────────────────────────

// Metadata for a runbook stored in ChromaDB.
// ChromaDB holds the vector embedding; this type mirrors the PostgreSQL
// metadata row used by the runbook management UI.
export interface Runbook {
    id: UUID;
    chroma_id: string; // ChromaDB document ID — used for updates/deletes
    title: string;
    service_name?: string; // undefined = applies to all services
    file_path?: string; // original Markdown source, for re-ingestion
    created_at: ISOTimestamp;
    updated_at: ISOTimestamp;
}

// ─── Anomaly detection ───────────────────────────────────────────────────────

export interface MetricEvent {
    service_name: string; // "payment-service"
    metric_name: MetricName; // typed — no raw strings
    value: number; // 94.0
    timestamp: ISOTimestamp; // ISO 8601: "2024-01-15T03:00:00Z"
    labels: Record<string, string>; // { "instance": "10.0.0.1:8080" }
}

// A MetricEvent that crossed a Tier 1 rule threshold.
// Written to PostgreSQL. Does NOT know about other anomalies.
export interface Anomaly extends MetricEvent {
    id: UUID;
    severity: Severity;
    threshold: number;
    detected_at: ISOTimestamp;
    processed: boolean;
}

// ─── Correlation ─────────────────────────────────────────────────────────────

// One item from the standard investigation checklist the correlate_node always
// checks. Records what was examined and what was found — powers the
// "what was ruled out" section of the decision brief.
export interface RuledOutItem {
    category:
        | "traffic_spike"
        | "memory_pressure"
        | "infrastructure_failure"
        | "recent_deploy"
        | "disk_pressure"
        | "network_saturation";
    checked: boolean;
    result: string; // "Normal — p95 request rate unchanged during window"
}

// One causal link in the timeline: service A anomaly propagated to service B.
// Populated by correlate_node using topology + timestamp ordering.
// Used by llm_node to format the causal_chain section of the decision brief.
export interface CausalLink {
    from_service: string;
    to_service: string;
    delta_seconds: number; // how many seconds after A did B deviate?
    evidence: string; // human-readable reason for the arrow
    topology_confirmed: boolean; // did the topology map confirm direction?
}

// Multiple Anomalies grouped, ordered into a causal timeline.
// The first timeline entry is the root cause candidate.
// This is what rag_node and llm_node receive as input.
export interface CorrelatedIncident {
    id: UUID;
    service: string; // primary (root cause) service
    root_cause_metric: {
        metric: MetricName;
        at: ISOTimestamp;
    };
    timeline: Array<{
        offset_seconds: number; // seconds from first bad signal (0 = root)
        metric: MetricName;
        severity: Severity;
        value: number;
        service: string; // which service this timeline entry is for
    }>;
    causal_chain: CausalLink[]; // ordered directed edges A→B→C
    blast_radius: string[]; // downstream services in impact order
    ruled_out: RuledOutItem[]; // standard checklist with findings
    confidence: number; // 0.0 – 1.0
    anomaly_ids: UUID[]; // source anomaly UUIDs, for DB processed flag
}

// ─── Incident report ─────────────────────────────────────────────────────────

// The CorrelatedIncident enriched with RAG runbook match and LLM-formatted output.
// Written to PostgreSQL as the permanent post-mortem record.
//
// Status transition rules:
//   OPEN → ACKNOWLEDGED  (engineer confirms they are looking at it)
//   ACKNOWLEDGED → RESOLVED  (incident closed)
//   OPEN | ACKNOWLEDGED → MUTED  (suppress noisy/known issue — future incidents
//     for the same service remain un-muted; MUTED is per-incident, not per-service)
export interface IncidentReport {
    id: UUID;
    correlated_incident_id: UUID;
    service: string;
    status: IncidentStatus;
    root_cause_summary: string;
    fix_steps: string[];
    causal_chain: CausalLink[]; // copied from CorrelatedIncident for the brief
    blast_radius: string[];
    confidence: number; // 0.87
    llm_fallback: boolean; // true → LLM used first-principles (no runbook)
    llm_unavailable: boolean; // true → LLM API was down entirely
    notification_sent: boolean; // tracks Slack delivery for retry
    created_at: ISOTimestamp;
    updated_at: ISOTimestamp;
}
