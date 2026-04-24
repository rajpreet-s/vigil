import type { ServiceNode, TopologyGraph } from "./types";

// ─── Concrete graph implementation ───────────────────────────────────────────

export class TopologyGraphImpl implements TopologyGraph {
    readonly services: Map<string, ServiceNode>;

    constructor(services: Map<string, ServiceNode>) {
        this.services = services;
    }

    getUpstream(serviceId: string): string[] {
        return this.services.get(serviceId)?.dependsOn.map(edge => edge.serviceId) ?? [];
    }

    getDownstream(serviceId: string): string[] {
        return this.services.get(serviceId)?.dependents ?? [];
    }

    /**
     * Returns true if `a` is anywhere in the transitive upstream chain of `b`.
     * DFS through b.dependsOn recursively. Tracks visited set to avoid
     * re-traversing the same node in diamond-dependency graphs.
     */
    isUpstreamOf(a: string, b: string): boolean {
        const visited = new Set<string>();

        const dfs = (current: string): boolean => {
            if (current === a) return true;
            if (visited.has(current)) return false;
            visited.add(current);

            for (const dep of this.getUpstream(current)) {
                if (dfs(dep)) return true;
            }
            return false;
        };

        // Start DFS from b's direct dependencies (not b itself)
        for (const dep of this.getUpstream(b)) {
            if (dfs(dep)) return true;
        }
        return false;
    }

    /**
     * BFS down the dependents graph starting from serviceId.
     * Returns all transitively impacted services in discovery order
     * (closest dependents first = natural blast radius ordering).
     */
    getBlastRadius(serviceId: string): string[] {
        const visited = new Set<string>([serviceId]);
        const queue: string[] = [serviceId];
        const result: string[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const dependent of this.getDownstream(current)) {
                if (!visited.has(dependent)) {
                    visited.add(dependent);
                    result.push(dependent);
                    queue.push(dependent);
                }
            }
        }

        return result;
    }

    findByPrometheusLabel(key: string, value: string): ServiceNode | null {
        for (const node of this.services.values()) {
            if (node.prometheusLabels[key] === value) {
                return node;
            }
        }
        return null;
    }
}