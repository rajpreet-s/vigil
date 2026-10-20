import type { ServiceNode, TopologyGraph } from "./types.js";
import { servicesMatch } from "./normalizer.js";

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

    /**
     * Resolves a service name or alias to the canonical service ID in the topology graph.
     */
    resolveServiceId(serviceName: string): string | null {
        if (this.services.has(serviceName)) {
            return serviceName;
        }

        // Fuzzy match using servicesMatch
        for (const [id] of this.services) {
            if (servicesMatch(id, serviceName)) {
                return id;
            }
        }
        return null;
    }

    /**
     * Checks if service `a` and `b` are connected within maxHops (undirected or directed).
     */
    areConnected(a: string, b: string, maxHops = 3): boolean {
        return this.getTransitiveDistance(a, b, maxHops) !== null;
    }

    /**
     * Returns the shortest path distance in hops between `a` and `b`.
     * Traverses both upstream and downstream edges to find structural affinity.
     * Returns null if no path exists within maxHops.
     */
    getTransitiveDistance(a: string, b: string, maxHops = 3): number | null {
        const sourceId = this.resolveServiceId(a);
        const targetId = this.resolveServiceId(b);

        if (!sourceId || !targetId) return null;
        if (sourceId === targetId) return 0;

        const visited = new Set<string>([sourceId]);
        const queue: Array<{ id: string; dist: number }> = [{ id: sourceId, dist: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.dist >= maxHops) continue;

            const neighbors = new Set<string>([
                ...this.getUpstream(current.id),
                ...this.getDownstream(current.id),
            ]);

            for (const neighbor of neighbors) {
                if (neighbor === targetId) {
                    return current.dist + 1;
                }
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, dist: current.dist + 1 });
                }
            }
        }

        return null;
    }
}