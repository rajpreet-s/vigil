import 'dotenv/config';

// ─── Prometheus HTTP client ───────────────────────────────────────────────────
//
// Thin wrappers around Prometheus HTTP API v1.
// Reads PROMETHEUS_QUERY_URL from env (just the base path including /api/v1/query).
//
// Both functions return formatted plain-text strings — not raw JSON.
// Keeping formatting here (not in the tool definitions) means the LLM always
// gets the same readable shape regardless of which tool calls this.

const BASE_URL = (process.env.PROMETHEUS_QUERY_URL ?? 'http://localhost:9090/api/v1/query')
    // Strip trailing /query so we can append /query or /query_range ourselves
    .replace(/\/query$/, '');

// ── Instant query ─────────────────────────────────────────────────────────────

export interface InstantResult {
    metric: Record<string, string>;
    value: [number, string]; // [timestamp, value]
}

/**
 * Runs a Prometheus instant query (single value at a point in time).
 * Returns the raw result array so callers can format as needed.
 */
export async function instantQuery(promql: string, time?: Date): Promise<InstantResult[]> {
    const params = new URLSearchParams({ query: promql });
    if (time) params.set('time', (time.getTime() / 1000).toFixed(3));

    const res = await fetch(`${BASE_URL}/query?${params}`);
    if (!res.ok) {
        throw new Error(`Prometheus instant query failed: ${res.status} ${await res.text()}`);
    }

    const body = await res.json() as {
        status: string;
        data: { resultType: string; result: InstantResult[] };
    };

    if (body.status !== 'success') {
        throw new Error(`Prometheus returned non-success status: ${body.status}`);
    }

    return body.data.result;
}

// ── Range query ───────────────────────────────────────────────────────────────

export interface RangeDataPoint {
    timestamp: Date;
    value: number;
}

export interface RangeSeries {
    labels: Record<string, string>;
    points: RangeDataPoint[];
}

/**
 * Runs a Prometheus range query.
 * Returns structured series data sorted by timestamp.
 */
export async function rangeQuery(
    promql: string,
    start: Date,
    end: Date,
    stepSeconds: number = 60
): Promise<RangeSeries[]> {
    const params = new URLSearchParams({
        query: promql,
        start: (start.getTime() / 1000).toFixed(3),
        end:   (end.getTime()   / 1000).toFixed(3),
        step:  String(stepSeconds),
    });

    const res = await fetch(`${BASE_URL}/query_range?${params}`);
    if (!res.ok) {
        throw new Error(`Prometheus range query failed: ${res.status} ${await res.text()}`);
    }

    const body = await res.json() as {
        status: string;
        data: {
            resultType: string;
            result: Array<{ metric: Record<string, string>; values: [number, string][] }>;
        };
    };

    if (body.status !== 'success') {
        throw new Error(`Prometheus returned non-success status: ${body.status}`);
    }

    return body.data.result.map((series) => ({
        labels: series.metric,
        points: series.values.map(([ts, val]) => ({
            timestamp: new Date(ts * 1000),
            value: parseFloat(val),
        })),
    }));
}

// ── Formatters ────────────────────────────────────────────────────────────────

/**
 * Formats a range series into a compact readable table for the LLM.
 * Shows every data point with UTC timestamp and value.
 */
export function formatRangeSeries(series: RangeSeries[], metric: string, service: string): string {
    if (series.length === 0) {
        return `No data found for metric "${metric}" on service "${service}".`;
    }

    const lines: string[] = [
        `metric: ${metric} | service: ${service}`,
        `series found: ${series.length}`,
    ];

    for (const s of series) {
        const labelStr = Object.entries(s.labels)
            .filter(([k]) => k !== '__name__')
            .map(([k, v]) => `${k}="${v}"`)
            .join(', ');

        lines.push(`  [${labelStr}]`);

        for (const pt of s.points) {
            const ts = pt.timestamp.toISOString().replace('T', ' ').slice(0, 19);
            lines.push(`    ${ts}  →  ${pt.value.toFixed(4)}`);
        }
    }

    return lines.join('\n');
}

/**
 * Formats instant query results into a compact readable block for the LLM.
 */
export function formatInstantResults(results: InstantResult[], label: string): string {
    if (results.length === 0) return `No data found for: ${label}`;

    const lines: string[] = [`${label}:`];
    for (const r of results) {
        const labelStr = Object.entries(r.metric)
            .filter(([k]) => k !== '__name__')
            .map(([k, v]) => `${k}="${v}"`)
            .join(', ');
        lines.push(`  [${labelStr}]  value: ${parseFloat(r.value[1]).toFixed(4)}`);
    }
    return lines.join('\n');
}
