/**
 * Service name normalization and label extraction utilities.
 *
 * Provides fuzzy matching, canonicalization, and infrastructure context
 * extraction from Alertmanager / Prometheus label sets.
 */

const COMMON_SUFFIXES = [
    '-service',
    '_service',
    '-svc',
    '_svc',
    '-api',
    '_api',
    '-app',
    '_app',
    '-worker',
    '_worker',
    '-backend',
    '_backend',
    '-frontend',
    '_frontend',
    '-daemon',
    '_daemon',
];

const COMMON_PREFIXES = [
    'prod-',
    'production-',
    'staging-',
    'stage-',
    'dev-',
    'development-',
    'test-',
];

/**
 * Normalizes a service name into a canonical token for fuzzy matching.
 * E.g., "checkout-service", "prod-checkout", "checkout_svc" -> "checkout".
 */
export function canonicalizeServiceName(name: string): string {
    if (!name || typeof name !== 'string') return '';

    let cleaned = name.trim().toLowerCase();

    // Strip common env prefixes
    for (const prefix of COMMON_PREFIXES) {
        if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 2) {
            cleaned = cleaned.slice(prefix.length);
            break;
        }
    }

    // Strip common service suffixes
    for (const suffix of COMMON_SUFFIXES) {
        if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
            cleaned = cleaned.slice(0, -suffix.length);
            break;
        }
    }

    // Normalize separators: underscores and dots to dashes, collapse duplicates
    cleaned = cleaned.replace(/[._]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    return cleaned || name.trim().toLowerCase();
}

/**
 * Checks if two service names refer to the same logical service.
 * Handles exact matches, canonical matches, and common naming variants.
 */
export function servicesMatch(serviceA: string, serviceB: string): boolean {
    if (!serviceA || !serviceB) return false;

    const a = serviceA.trim().toLowerCase();
    const b = serviceB.trim().toLowerCase();

    if (a === b) return true;

    const canonA = canonicalizeServiceName(a);
    const canonB = canonicalizeServiceName(b);

    if (canonA && canonB && canonA === canonB) return true;

    // Check if one contains the other as a word/token if length is significant
    if (canonA.length >= 3 && canonB.length >= 3) {
        if (a === `${b}-service` || b === `${a}-service`) return true;
        if (a === `${b}-svc` || b === `${a}-svc`) return true;
        if (a === `${b}-api` || b === `${a}-api`) return true;
    }

    return false;
}

/**
 * Extracts a candidate service name from a Prometheus / Alertmanager label set.
 * Checks standard label conventions in priority order.
 */
export function extractServiceNameFromLabels(labels: Record<string, any>): string | null {
    if (!labels || typeof labels !== 'object') return null;

    const candidates = [
        labels.service,
        labels.service_name,
        labels.app,
        labels['app.kubernetes.io/name'],
        labels['app.kubernetes.io/instance'],
        labels.job,
        labels.container,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            // Filter out generic infrastructure jobs that are not service names
            const val = candidate.trim();
            if (val !== 'node-exporter' && val !== 'kube-state-metrics' && val !== 'prometheus') {
                return val;
            }
        }
    }

    // Fallback: check pod name by stripping pod replica hash (e.g. checkout-78d6b-x99 -> checkout)
    if (typeof labels.pod === 'string' && labels.pod.trim()) {
        const podName = labels.pod.trim();
        const stripped = podName.replace(/-[0-9a-f]{8,10}-[0-9a-z]{5}$/i, '');
        if (stripped && stripped !== podName) {
            return stripped;
        }
    }

    return null;
}

export interface InfraContext {
    namespace?: string;
    cluster?: string;
    node?: string;
    host?: string;
    environment?: string;
}

/**
 * Extracts infrastructure context (namespace, cluster, node, host) from alert labels.
 */
export function extractInfraContext(labels: Record<string, any>): InfraContext {
    if (!labels || typeof labels !== 'object') return {};

    const namespace = labels.namespace || labels.kubernetes_namespace || labels['k8s_namespace'];
    const cluster = labels.cluster || labels.cluster_id || labels['kubernetes_cluster'];
    const node = labels.node || labels.instance || labels.host || labels.nodename;
    const host = labels.host || labels.hostname;
    const environment = labels.environment || labels.env;

    return {
        ...(namespace ? { namespace: String(namespace).trim().toLowerCase() } : {}),
        ...(cluster ? { cluster: String(cluster).trim().toLowerCase() } : {}),
        ...(node ? { node: String(node).trim().toLowerCase() } : {}),
        ...(host ? { host: String(host).trim().toLowerCase() } : {}),
        ...(environment ? { environment: String(environment).trim().toLowerCase() } : {}),
    };
}

/**
 * Computes an infrastructure similarity score between two label sets (0.0 to 1.0).
 * Matches on namespace, cluster, node/host, and environment.
 */
export function computeInfraSimilarity(labelsA: Record<string, any>, labelsB: Record<string, any>): number {
    const ctxA = extractInfraContext(labelsA);
    const ctxB = extractInfraContext(labelsB);

    let matchCount = 0;
    let totalChecked = 0;

    if (ctxA.namespace && ctxB.namespace) {
        totalChecked++;
        if (ctxA.namespace === ctxB.namespace) matchCount++;
    }

    if (ctxA.cluster && ctxB.cluster) {
        totalChecked++;
        if (ctxA.cluster === ctxB.cluster) matchCount++;
    }

    if (ctxA.node && ctxB.node) {
        totalChecked++;
        // Nodes or hosts can be IP:port or hostname:port
        const cleanNodeA = ctxA.node.split(':')[0];
        const cleanNodeB = ctxB.node.split(':')[0];
        if (cleanNodeA === cleanNodeB) matchCount++;
    }

    if (ctxA.environment && ctxB.environment) {
        totalChecked++;
        if (ctxA.environment === ctxB.environment) matchCount++;
    }

    if (totalChecked === 0) return 0;
    return matchCount / totalChecked;
}
