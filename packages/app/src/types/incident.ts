export interface TimelineEvent {
  time: string;
  event: string;
  status: 'error' | 'warning' | 'info' | 'success';
}

export interface Incident {
  id: string;
  title: string;
  status: 'reviewing' | 'resolved' | 'dismissed';
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  source: string;
  alertsCount: number;
  confidence: number;
  suspectedRootCause: string;
  impactedServices: string[];
  timeline: TimelineEvent[];
}

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
