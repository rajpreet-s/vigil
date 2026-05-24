import { PrismaClient, Severity } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import type { AlertPayload } from "../types/webhook.ts";

export class WebhookService {
    private prisma: PrismaClient;
    private logger: FastifyBaseLogger | undefined;

    constructor(prisma: PrismaClient, logger?: FastifyBaseLogger) {
        this.prisma = prisma;
        this.logger = logger;
    }

    /**
     * Resolves an alert by dynamically finding or provisioning the associated service,
     * normalizing the alert metric name/severity, and persisting the anomaly to the database
     * using an idempotent upsert (ON CONFLICT DO NOTHING).
     */
    public async processAlert(alert: AlertPayload): Promise<void> {
        const serviceName = alert.labels.service;
        const alertName = alert.labels.alertname;

        const formattedDisplayName = serviceName
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, char => char.toUpperCase());

        // 1. Find or dynamically provision the Service using an atomic upsert to avoid race conditions
        const service = await this.prisma.service.upsert({
            where: { name: serviceName },
            update: {}, // Do nothing if it already exists
            create: {
                name: serviceName,
                display_name: formattedDisplayName,
            }
        });

        // 2. Map and parse parameters
        const mappedMetric = this.resolveMetricName(alertName);
        const severity = this.translateSeverity(alert.labels.severity);
        const detectedAt = new Date(alert.startsAt);

        // 3. Persist the Anomaly in Postgres (Idempotent: ON CONFLICT DO NOTHING)
        await this.prisma.anomaly.upsert({
            where: {
                metric_name_service_name_detected_at: {
                    metric_name: mappedMetric,
                    service_name: serviceName,
                    detected_at: detectedAt,
                }
            },
            update: {}, // DO NOTHING on conflict
            create: {
                metric_name: mappedMetric,
                service_name: serviceName,
                severity,
                detected_at: detectedAt,
                raw_payload: alert as any,
                processed: false
            }
        });
    }

    /**
     * Intelligent mapper to resolve incoming Alertmanager alert names to
     * Vigil's standard Prometheus metric names to prevent correlation breaks.
     * Uses prioritized keyword rules and extensive string normalization.
     */
    private resolveMetricName(alertname: string): string {
        const lower = alertname.toLowerCase();

        // 1. Prioritized standard metric patterns
        const metricRules: Array<{ keywords: string[]; standardName: string }> = [
            { keywords: ["cpu", "processor"], standardName: "cpu_usage_percent" },
            { keywords: ["memory", "mem", "ram"], standardName: "memory_usage_percent" },
            { keywords: ["error", "fail", "exception", "crash", "5xx", "status5"], standardName: "error_rate" },
            { keywords: ["traffic", "request_rate", "rps", "qps", "throughput", "volume"], standardName: "request_rate" },
            { keywords: ["latency", "duration", "delay", "response_time", "p99", "p95", "p90"], standardName: "p99_latency_ms" },
            { keywords: ["connection", "conn", "pool"], standardName: "db_connections" },
            { keywords: ["network", "bandwidth", "net_"], standardName: "network_io_bytes" },
            { keywords: ["disk", "storage", "io_"], standardName: "disk_io_bytes" },
        ];

        for (const rule of metricRules) {
            if (rule.keywords.some(keyword => lower.includes(keyword))) {
                return rule.standardName;
            }
        }

        // 2. Advanced Normalization for custom alert names
        let normalized = alertname
            // Split camelCase words (e.g., ApiLatency -> Api_Latency)
            .replace(/([a-z])([A-Z])/g, "$1_$2")
            // Convert spaces, dashes, dots, slashes to underscores
            .replace(/[\s\-\.\/]+/g, "_")
            .toLowerCase();

        // Remove redundant alert noise words
        const noiseWords = [
            "alert",
            "warning",
            "critical",
            "high",
            "low",
            "too",
            "excessive",
            "anomaly",
            "incident",
            "error"
        ];
        
        for (const word of noiseWords) {
            // Match the word as a full snake_case token
            normalized = normalized
                .replace(new RegExp(`^${word}_|_?${word}_|_?${word}$`, "g"), "_");
        }

        // Clean up redundant underscores and leading/trailing punctuation
        return normalized
            .replace(/_+/g, "_")      // Merge multiple underscores (e.g. ___ -> _)
            .replace(/^_+|_+$/g, "");  // Trim leading/trailing underscores
    }

    /**
     * Translates incoming Alertmanager severities to standard uppercase categories:
     * - "CRITICAL": For high-severity alerts (critical, error, fatal)
     * - "WARNING": For medium-severity alerts (warning, warn)
     * - "INFO": For low-severity/informational alerts (info, debug, notice)
     * - Defaults to "WARNING" if no severity is provided or matches.
     */
    private translateSeverity(severity?: string): Severity {
        if (!severity) return "WARNING";
        
        const lower = severity.toLowerCase().trim();
        
        switch (lower) {
            case "critical":
            case "error":
            case "fatal":
            case "err":
            case "panic":
                return "CRITICAL";
                
            case "info":
            case "debug":
            case "notice":
            case "verbose":
                return "INFO";
                
            case "warning":
            case "warn":
                return "WARNING";
                
            default:
                return "WARNING";
        }
    }
}
