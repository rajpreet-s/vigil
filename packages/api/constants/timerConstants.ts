/**
 * Time boundaries and delay settings for Incident Coordinator
 */

/**
 * The window of time (in milliseconds) used to query active incidents.
 * Incidents that have not been updated within this window are considered stale.
 */
export const INCIDENT_LOOKBACK_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * The maximum allowed duration (in milliseconds) from the start of an incident
 * before triggering the analysis pipeline, regardless of ongoing anomalies.
 */
export const INCIDENT_HARD_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * The debounce delay (in milliseconds) to wait after the last anomaly
 * is grouped into the incident before triggering analysis.
 */
export const INCIDENT_SETTLE_DELAY_MS = 90 * 1000; // 90 seconds
