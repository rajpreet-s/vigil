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
     * normalizing the alert metric name/severity, and persisting the anomaly to the database.
     */
    public async processAlert(alert: AlertPayload): Promise<void> {
        const serviceName = alert.labels.service;
        const alertName = alert.labels.alertname;

        // 1. Find or dynamically provision the Service
        let service = await this.prisma.service.findUnique({
            where: { name: serviceName }
        });

        if (!service) {
            this.logger?.info(`Dynamic provisioning triggered: Creating service "${serviceName}"`);

            const formattedDisplayName = serviceName
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, char => char.toUpperCase());

            service = await this.prisma.service.create({
                data: {
                    name: serviceName,
                    display_name: formattedDisplayName,
                }
            });
        }

        // 2. Map and parse parameters
        const mappedMetric = this.resolveMetricName(alertName);
        const severity = this.translateSeverity(alert.labels.severity);
        const detectedAt = new Date(alert.startsAt);

        // 3. Persist the Anomaly in Postgres
        await this.prisma.anomaly.create({
            data: {
                service_id: service.id,
                severity,
                metric: mappedMetric,
                value: 1.0,        // Default float placeholder
                threshold: 1.0,    // Default float placeholder
                labels: alert.labels || {}, // Keep all original labels for LangGraph context
                detected_at: detectedAt,
                processed: false   // Queued for agent processing
            }
        });
    }

    /**
     * Intelligent mapper to resolve incoming Alertmanager alert names to
     * Vigil's standard Prometheus metric names to prevent correlation breaks.
     */
    private resolveMetricName(alertname: string): string {
        const lower = alertname.toLowerCase();
        if (lower.includes("cpu")) return "cpu_usage_percent";
        if (lower.includes("memory") || lower.includes("mem")) return "memory_usage_percent";
        if (lower.includes("error") || lower.includes("fail") || lower.includes("exception")) return "error_rate";
        if (lower.includes("traffic") || lower.includes("request_rate") || lower.includes("rps")) return "request_rate";
        if (lower.includes("latency") || lower.includes("p99") || lower.includes("p95") || lower.includes("duration")) return "p99_latency_ms";
        if (lower.includes("connection") || lower.includes("db_conn")) return "db_connections";
        if (lower.includes("network") || lower.includes("net_")) return "network_io_bytes";
        if (lower.includes("disk") || lower.includes("io_")) return "disk_io_bytes";

        // Normalize custom alert names to snake_case
        return alertname
            .replace(/([a-z])([A-Z])/g, "$1_$2")
            .replace(/[\s-]+/g, "_")
            .toLowerCase();
    }

    /**
     * Translates incoming Alertmanager severities to the Postgres database Severity enum
     */
    private translateSeverity(severity?: string): Severity {
        if (!severity) return Severity.WARNING;
        const upper = severity.toUpperCase();
        if (upper === "CRITICAL" || upper === "ERROR") return Severity.CRITICAL;
        return Severity.WARNING;
    }
}
