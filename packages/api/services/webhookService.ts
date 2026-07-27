import { PrismaClient, Severity } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { AlertPayload, GitHubCommit } from '../types/webhook.js';
import { IncidentCoordinator } from './incident-coordinator/IncidentCoordinator.js';

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
     * using read-heavy optimizations and idempotency safety.
     */
    public async processAlert(alert: AlertPayload, orgId?: string): Promise<void> {
        const serviceName = alert.labels.service;
        const alertName = alert.labels.alertname;

        const formattedDisplayName = serviceName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());

        // 1. Read-heavy optimization: Check if it exists first (Fast index read, no write-locks)
        let service = await this.prisma.service.findUnique({
            where: { name: serviceName },
        });

        // 2. Provision dynamically ONLY if it doesn't exist
        if (!service) {
            try {
                service = await this.prisma.service.create({
                    data: {
                        name: serviceName,
                        display_name: formattedDisplayName,
                        org_id: orgId || null,
                    },
                });
            } catch (err: any) {
                // Handle the race condition: if another concurrent request created it first, fetch it
                if (err.code === 'P2002') {
                    service = await this.prisma.service.findUnique({
                        where: { name: serviceName },
                    });
                } else {
                    throw err;
                }
            }
        }

        if (!service) {
            throw new Error(`Failed to find or provision service: ${serviceName}`);
        }

        // 3. Map and parse parameters
        const mappedMetric = this.resolveMetricName(alertName);
        const severity = this.translateSeverity(alert.labels.severity);
        const detectedAt = new Date(alert.startsAt);

        // 4. Persist the Anomaly with Concurrency Deduplication (Idempotency check)
        let anomaly;
        let isNewAnomaly = true;
        try {
            anomaly = await this.prisma.anomaly.create({
                data: {
                    metric_name: mappedMetric,
                    service_name: serviceName,
                    severity,
                    detected_at: detectedAt,
                    raw_payload: alert as any,
                    processed: false,
                    org_id: orgId || service.org_id || null,
                },
            });
        } catch (err: any) {
            // Deduplicate: Catch concurrent retries from Alertmanager
            if (err.code === 'P2002') {
                isNewAnomaly = false;
                anomaly = await this.prisma.anomaly.findUnique({
                    where: {
                        metric_name_service_name_detected_at: {
                            metric_name: mappedMetric,
                            service_name: serviceName,
                            detected_at: detectedAt,
                        },
                    },
                });
            } else {
                throw err;
            }
        }

        // 5. Trigger coordination asynchronously in-memory ONLY for fresh, unique anomalies
        if (anomaly && isNewAnomaly) {
            this.callIncidentCoordinator(anomaly.id);
        }
    }

    public async processDeployment(commit: GitHubCommit, headCommit: any, ref: string): Promise<void> {
        const filesChanged = [
            ...commit.added,
            ...commit.removed,
            ...commit.modified
        ];

        const serviceName = this.extractServiceName(filesChanged);
        if (!serviceName) {
            this.logger?.info(`Skipping commit ${commit.id} because it did not affect any service packages.`);
            return;
        }

        const branch = ref.replace('refs/heads/', '');
        const author = commit.author?.name || headCommit?.author?.name || 'unknown';
        const commitSha = commit.id;
        const prTitle = commit.message.split('\n')[0] ?? null; // Use first line of commit message as PR title
        const deployedAt = new Date(commit.timestamp || headCommit?.timestamp || new Date());

        this.logger?.info(`Registering deployment event for service ${serviceName}, commit: ${commitSha}`);

        // Insert into deploy_events table
        const deployEvent = await this.prisma.deployEvent.create({
            data: {
                service_name: serviceName,
                pr_title: prTitle,
                branch,
                author,
                commit_sha: commitSha,
                files_changed: filesChanged,
                deployed_at: deployedAt
            }
        });

        // Call IncidentCoordinator.onDeployArrived(deployId)
        await IncidentCoordinator.onDeployArrived(deployEvent.id, this.prisma, this.logger);
    }

    private extractServiceName(files: string[]): string | null {
        // Common root directories used in monorepo and multi-service repositories
        const serviceRoots = ['packages', 'services', 'apps', 'components', 'src'];

        for (const file of files) {
            // Normalize path separators to forward slashes just in case
            const normalizedPath = file.replace(/\\/g, '/');
            const parts = normalizedPath.split('/');
            
            if (parts.length > 1) {
                const rootDir = parts[0];
                if (rootDir && serviceRoots.includes(rootDir)) {
                    // For packages/checkout/src/... -> checkout-service
                    const secondDir = parts[1];
                    if (secondDir) {
                        return `${secondDir}-service`;
                    }
                } else if (rootDir) {
                    // For checkout/src/... -> checkout-service
                    return `${rootDir}-service`;
                }
            }
        }
        return null;
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
            {
                keywords: ['cpu', 'processor'],
                standardName: 'cpu_usage_percent',
            },
            {
                keywords: ['memory', 'mem', 'ram'],
                standardName: 'memory_usage_percent',
            },
            {
                keywords: ['error', 'fail', 'exception', 'crash', '5xx', 'status5'],
                standardName: 'error_rate',
            },
            {
                keywords: ['traffic', 'request_rate', 'rps', 'qps', 'throughput', 'volume'],
                standardName: 'request_rate',
            },
            {
                keywords: ['latency', 'duration', 'delay', 'response_time', 'p99', 'p95', 'p90'],
                standardName: 'p99_latency_ms',
            },
            {
                keywords: ['connection', 'conn', 'pool'],
                standardName: 'db_connections',
            },
            {
                keywords: ['network', 'bandwidth', 'net_'],
                standardName: 'network_io_bytes',
            },
            {
                keywords: ['disk', 'storage', 'io_'],
                standardName: 'disk_io_bytes',
            },
        ];

        for (const rule of metricRules) {
            if (rule.keywords.some((keyword) => lower.includes(keyword))) {
                return rule.standardName;
            }
        }

        // 2. Advanced Normalization for custom alert names
        let normalized = alertname
            // Split camelCase words (e.g., ApiLatency -> Api_Latency)
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            // Convert spaces, dashes, dots, slashes to underscores
            .replace(/[\s\-./]+/g, '_')
            .toLowerCase();

        // Remove redundant alert noise words
        const noiseWords = [
            'alert',
            'warning',
            'critical',
            'high',
            'low',
            'too',
            'excessive',
            'anomaly',
            'incident',
            'error',
        ];

        for (const word of noiseWords) {
            // Match the word as a full snake_case token
            normalized = normalized.replace(
                new RegExp(`^${word}_|_?${word}_|_?${word}$`, 'g'),
                '_'
            );
        }

        // Clean up redundant underscores and leading/trailing punctuation
        return normalized
            .replace(/_+/g, '_') // Merge multiple underscores (e.g. ___ -> _)
            .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
    }

    /**
     * Translates incoming Alertmanager severities to standard uppercase categories:
     * - "CRITICAL": For high-severity alerts (critical, error, fatal)
     * - "WARNING": For medium-severity alerts (warning, warn)
     * - "INFO": For low-severity/informational alerts (info, debug, notice)
     * - Defaults to "WARNING" if no severity is provided or matches.
     */
    private translateSeverity(severity?: string): Severity {
        if (!severity) return 'WARNING';

        const lower = severity.toLowerCase().trim();

        switch (lower) {
            case 'critical':
            case 'error':
            case 'fatal':
            case 'err':
            case 'panic':
                return 'CRITICAL';

            case 'info':
            case 'debug':
            case 'notice':
            case 'verbose':
                return 'INFO';

            case 'warning':
            case 'warn':
                return 'WARNING';

            default:
                return 'WARNING';
        }
    }

    private callIncidentCoordinator(anomalyId: string) {
        setImmediate(async () => {
            try {
                const coordinator = new IncidentCoordinator(
                    anomalyId as any,
                    this.prisma,
                    this.logger
                );
                await coordinator.coordinate();
            } catch (err) {
                this.logger?.error(err, `Failed to coordinate anomaly ${anomalyId}`);
            }
        });
    }
}
