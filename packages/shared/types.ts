// ─── Branded primitives ──────────────────────────────────────────────────────
export type UUID = string & { readonly __brand: "UUID" };
export type ISOTimestamp = string & { readonly __brand: "ISOTimestamp" };

// ─── Enums ───────────────────────────────────────────────────────────────────
export const SEVERITY_LEVELS = ["CRITICAL", "WARNING"] as const;
export type Severity = typeof SEVERITY_LEVELS[number];

export const INCIDENT_STATUSES = ["OPEN", "PENDING_REVIEW", "APPROVED", "DISMISSED"] as const;
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
export interface Incident {
    id: UUID;
    thread_id: UUID;
    status: IncidentStatus;
    
    // Affiliation
    services_affected: string[];
    
    // Core Diagnostics & Timeline
    root_cause_metric?: {
        metric: MetricName;
        at: ISOTimestamp;
    };
    timeline?: Array<{
        offset_seconds: number;
        metric: MetricName;
        severity: Severity;
        value: number;
        service: string;
    }>;
    causal_chain?: CausalLink[];
    blast_radius: string[];
    ruled_out?: RuledOutItem[];
    
    // LLM Report Data
    root_cause_service?: string;
    rca_summary?: string;
    fix_steps?: string[];
    confidence?: string; // 'HIGH' | 'MEDIUM' | 'LOW'
    
    // Orchestration & Notification
    llm_fallback: boolean;
    llm_unavailable: boolean;
    notification_sent: boolean;
    
    // Timing
    started_at: ISOTimestamp;
    updated_at: ISOTimestamp;
    resolved_at?: ISOTimestamp;
}

// Backwards compatibility aliases
export type CorrelatedIncident = Incident;
export type IncidentReport = Incident;
