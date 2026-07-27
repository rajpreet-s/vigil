export interface TimelineEvent {
  time: string;
  event: string;
  status: 'error' | 'warning' | 'info' | 'success';
}

export interface Incident {
  id: string;
  title: string;
  status: 'reviewing' | 'resolved' | 'dismissed' | 'open' | 'pending_review' | 'approved' | 'processing' | 'failed' | string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  source: string;
  alertsCount: number;
  confidence: number;
  suspectedRootCause: string;
  impactedServices: string[];
  timeline: TimelineEvent[];
  anomalies?: any[];
  causal_chain?: any[];
  blast_radius?: string[];
  ruled_out?: any[];
  fix_steps?: any[];
  root_cause_metric?: any;
}

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export interface ApiIncident {
  id: string;
  thread_id: string;
  status: 'OPEN' | 'PENDING_REVIEW' | 'APPROVED' | 'DISMISSED' | 'PROCESSING' | 'FAILED' | string;
  services_affected: string[];
  root_cause_service: string | null;
  rca_summary: string | null;
  confidence: string | null;
  started_at: string;
  updated_at: string;
  resolved_at: string | null;
  anomaly_count: number;
}

export interface PaginatedIncidentsResponse {
  data: ApiIncident[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}
