import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import {
    rangeQuery,
    instantQuery,
    formatRangeSeries,
    formatInstantResults,
} from './prometheusClient.js';
import { prisma } from '../prisma.js';
import type { TopologyGraph } from '../../shared/topology/types.js';

// ─── Investigation Tools ──────────────────────────────────────────────────────
//
// Five tools the LLM can call inside investigate_node.
// Each tool returns a plain-text string — structured for readability, not for
// machine parsing. The LLM sees these strings directly in the message history.
//
// Design rules:
//   1. All failures return a descriptive error string (not throw) — the LLM
//      should see "Prometheus unavailable" and reason around it.
//   2. All outputs are formatted for reading, not machine parsing.
//   3. Tools are created by factory functions that close over runtime state
//      (topology, anomaly timestamps) so tool definitions stay pure.

// ── Tool 1: query_prometheus_range ───────────────────────────────────────────

export const queryPrometheusRangeTool = new DynamicStructuredTool({
    name: 'query_prometheus_range',
    description:
        'Fetches a time-series for a Prometheus metric over a past window. ' +
        'Use this to see whether a metric spiked suddenly (deploy-induced) or climbed gradually ' +
        '(resource exhaustion). The window is in minutes before now.',
    schema: z.object({
        metric:         z.string().describe('Prometheus metric name, e.g. "http_errors_total"'),
        service:        z.string().describe('Service label value to filter by, e.g. "api-service"'),
        windowMinutes:  z.number().int().min(5).max(180).describe('How many minutes back to look (5–180)'),
        stepSeconds:    z.number().int().min(15).max(300).default(60).describe('Data point interval in seconds'),
    }),
    func: async ({ metric, service, windowMinutes, stepSeconds }) => {
        try {
            const end   = new Date();
            const start = new Date(end.getTime() - windowMinutes * 60 * 1000);

            // Build a PromQL query that filters by common service label patterns
            const promql = `{__name__="${metric}", service="${service}"}`;

            const series = await rangeQuery(promql, start, end, stepSeconds);
            return formatRangeSeries(series, metric, service);
        } catch (err) {
            return `query_prometheus_range failed: ${err instanceof Error ? err.message : String(err)}`;
        }
    },
});

// ── Tool 2: query_related_metrics ─────────────────────────────────────────────

// The fixed set of health signals we query for any service.
// These cover the four golden signals (errors, latency, saturation, traffic).
const HEALTH_SIGNALS = [
    'http_requests_total',
    'http_request_duration_seconds',
    'process_cpu_seconds_total',
    'process_resident_memory_bytes',
];

export const queryRelatedMetricsTool = new DynamicStructuredTool({
    name: 'query_related_metrics',
    description:
        'Queries all key health signals for a service at a specific point in time (instant query). ' +
        'Use this to see whether the incident was a single-metric anomaly (code path bug) ' +
        'or a whole-service collapse (resource exhaustion / bad deploy). ' +
        'Pass the anomaly timestamp as ISO 8601.',
    schema: z.object({
        service:   z.string().describe('Service name to query health signals for'),
        timestamp: z.string().describe('ISO 8601 timestamp to query at, e.g. "2024-01-01T10:02:00Z"'),
    }),
    func: async ({ service, timestamp }) => {
        try {
            const time = new Date(timestamp);
            const results: string[] = [`Health signals for service "${service}" at ${timestamp}:`];

            for (const metric of HEALTH_SIGNALS) {
                try {
                    const promql = `{__name__="${metric}", service="${service}"}`;
                    const data   = await instantQuery(promql, time);
                    results.push(formatInstantResults(data, `  ${metric}`));
                } catch {
                    results.push(`  ${metric}: unavailable`);
                }
            }

            return results.join('\n');
        } catch (err) {
            return `query_related_metrics failed: ${err instanceof Error ? err.message : String(err)}`;
        }
    },
});

// ── Tool 3: get_metric_baseline ───────────────────────────────────────────────

export const getMetricBaselineTool = new DynamicStructuredTool({
    name: 'get_metric_baseline',
    description:
        'Computes the 7-day average and standard deviation for a metric on a service using Prometheus. ' +
        'Use this to contextualise a current value — "18% error rate" is more meaningful as ' +
        '"44x above the 7-day baseline of 0.41%". Always call this after seeing an anomalous value.',
    schema: z.object({
        metric:  z.string().describe('Prometheus metric name'),
        service: z.string().describe('Service name to filter by'),
    }),
    func: async ({ metric, service }) => {
        try {
            // avg_over_time gives the 7-day average; stddev_over_time gives spread
            const avgPromql    = `avg_over_time({__name__="${metric}", service="${service}"}[7d])`;
            const stddevPromql = `stddev_over_time({__name__="${metric}", service="${service}"}[7d])`;
            const currentPromql = `{__name__="${metric}", service="${service}"}`;

            const [avgRes, stddevRes, currentRes] = await Promise.all([
                instantQuery(avgPromql).catch(() => []),
                instantQuery(stddevPromql).catch(() => []),
                instantQuery(currentPromql).catch(() => []),
            ]);

            const avg     = avgRes[0]     ? parseFloat(avgRes[0].value[1])     : null;
            const stddev  = stddevRes[0]  ? parseFloat(stddevRes[0].value[1])  : null;
            const current = currentRes[0] ? parseFloat(currentRes[0].value[1]) : null;

            const lines: string[] = [
                `Baseline for metric "${metric}" on service "${service}":`,
                `  7-day avg:    ${avg     !== null ? avg.toFixed(4)     : 'unavailable'}`,
                `  7-day stddev: ${stddev  !== null ? stddev.toFixed(4)  : 'unavailable'}`,
                `  current:      ${current !== null ? current.toFixed(4) : 'unavailable'}`,
            ];

            if (avg !== null && current !== null && avg > 0) {
                const ratio = current / avg;
                lines.push(`  ratio:        ${ratio.toFixed(1)}x above 7-day average`);
            }

            return lines.join('\n');
        } catch (err) {
            return `get_metric_baseline failed: ${err instanceof Error ? err.message : String(err)}`;
        }
    },
});

// ── Tool 4: get_recent_deployments ────────────────────────────────────────────

export const getRecentDeploymentsTool = new DynamicStructuredTool({
    name: 'get_recent_deployments',
    description:
        'Queries the deploy_events database table for deployments on a given service ' +
        'within the specified window. Use this when the pre-computed deployCorrelation ' +
        'in context is empty, or when you want to check a different service or a wider time window. ' +
        'Returns PR title, author, commit SHA, files changed, and deploy timestamp.',
    schema: z.object({
        service:       z.string().describe('Service name to look up deploy events for'),
        windowMinutes: z.number().int().min(10).max(240).describe('How many minutes back to look (10–240)'),
    }),
    func: async ({ service, windowMinutes }) => {
        try {
            const since = new Date(Date.now() - windowMinutes * 60 * 1000);

            const deploys = await prisma.deployEvent.findMany({
                where: {
                    service_name: service,
                    deployed_at:  { gte: since },
                },
                orderBy: { deployed_at: 'desc' },
            });

            if (deploys.length === 0) {
                return `No deployments found for service "${service}" in the last ${windowMinutes} minutes.`;
            }

            const lines: string[] = [
                `Deployments for "${service}" in the last ${windowMinutes} minutes (${deploys.length} found):`,
            ];

            for (const d of deploys) {
                let files: string[] = [];
                try {
                    const raw = d.files_changed;
                    files = Array.isArray(raw) ? (raw as string[]) : JSON.parse(raw as string);
                } catch {
                    files = [];
                }

                lines.push(
                    `\n  deployed_at:   ${d.deployed_at.toISOString()}`,
                    `  PR:            ${d.pr_title ?? '(no title)'}`,
                    `  branch:        ${d.branch}`,
                    `  author:        ${d.author}`,
                    `  commit:        ${d.commit_sha}`,
                    `  files changed: ${files.length > 0 ? files.join(', ') : '(none recorded)'}`,
                );
            }

            return lines.join('\n');
        } catch (err) {
            return `get_recent_deployments failed: ${err instanceof Error ? err.message : String(err)}`;
        }
    },
});

// ── Tool 5: get_blast_radius ──────────────────────────────────────────────────
//
// Factory function — takes the topology from state at node invocation time.
// Returns a tool instance with the topology already closed over.

export function makeGetBlastRadiusTool(topology: TopologyGraph | null) {
    return new DynamicStructuredTool({
        name: 'get_blast_radius',
        description:
            'Returns all services that are transitively downstream of a given service ' +
            'in the dependency topology. Use this to confirm or deny the cascade story: ' +
            'if all anomalous services appear in the blast radius of the root cause candidate, ' +
            'the cascade is structurally confirmed. If anomalous services are NOT in the blast ' +
            'radius, the anomalies may be unrelated coincidences.',
        schema: z.object({
            service: z.string().describe('Service to compute blast radius for'),
        }),
        func: async ({ service }) => {
            if (!topology) {
                return 'get_blast_radius: topology is not available for this incident.';
            }

            const downstream = topology.getBlastRadius(service);

            if (downstream.length === 0) {
                return `Blast radius of "${service}": no downstream dependents found in topology.`;
            }

            return [
                `Blast radius of "${service}":`,
                `  downstream services (${downstream.length}): ${downstream.join(', ')}`,
                `  Interpretation: if any of these services are also anomalous, the cascade is topologically confirmed.`,
            ].join('\n');
        },
    });
}
