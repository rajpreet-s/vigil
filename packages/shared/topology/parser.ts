import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ServiceNode, TopologyGraph } from "./types";
import { TopologyGraphImpl } from "./graph";
// ─── Raw YAML shape ──────────────────────────────────────────────────────────

interface RawService {
    display_name?: string;
    depends_on?: string[];
    prometheus_labels?: Record<string, string>;
}

interface RawTopology {
    version?: string;
    services?: Record<string, RawService>;
}

// ─── Circular dependency detection ───────────────────────────────────────────

/**
 * DFS-based cycle detector. Throws a descriptive error including the full
 * cycle path on detection, e.g.:
 *   "Circular dependency detected: api_service → auth_service → api_service"
 *
 * Uses three-colour marking (white/grey/black) — the standard approach:
 *   white (absent from both sets) = not yet visited
 *   grey (in recursionStack)       = currently on the DFS stack = cycle if revisited
 *   black (in visited)             = fully resolved, safe
 */
export function detectCycles(services: Map<string, ServiceNode>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, pathSoFar: string[]): void => {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const node = services.get(nodeId)!;
        for (const dep of node.dependsOn) {
            if (recursionStack.has(dep)) {
                // Build the cycle portion of the path for the error message
                const cycleStart = pathSoFar.indexOf(dep);
                const cyclePath = [...pathSoFar.slice(cycleStart), dep].join(" → ");
                throw new Error(`Circular dependency detected: ${cyclePath}`);
            }

            if (!visited.has(dep)) {
                dfs(dep, [...pathSoFar, dep]);
            }
        }

        recursionStack.delete(nodeId);
    };

    for (const nodeId of services.keys()) {
        if (!visited.has(nodeId)) {
            dfs(nodeId, [nodeId]);
        }
    }
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parses the topology YAML at the given path and returns a fully-validated
 * in-memory TopologyGraph.
 *
 * Throws descriptive errors on:
 *   - Missing version field
 *   - Unknown service referenced in depends_on
 *   - Circular dependencies
 *
 * Warnings (non-fatal) are emitted via console.warn for:
 *   - Service with empty prometheus_labels
 *
 * @param filePath Absolute path to the topology YAML file.
 *                 Defaults to <project root>/user-files/topology/topology.yaml
 */
export function parseTopology(filePath?: string): TopologyGraph {
    // ── Step 1: Read and parse YAML ──────────────────────────────────────────
    const resolvedPath = filePath ?? path.resolve(process.cwd(), "user-files", "topology", "topology.yaml");

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(
            `Topology file not found at: ${resolvedPath}\n` + `Create user-files/topology/topology.yaml to proceed.`,
        );
    }

    const raw = yaml.load(fs.readFileSync(resolvedPath, "utf8")) as RawTopology;

    // ── Step 2: Validate structure ───────────────────────────────────────────
    if (!raw?.version) {
        throw new Error(`Error: version field missing — add version: "1" to topology file`);
    }

    if (!raw.services || Object.keys(raw.services).length === 0) {
        throw new Error(`Error: topology file has no services defined`);
    }

    const serviceKeys = new Set(Object.keys(raw.services));

    // Validate all depends_on references point to defined services
    for (const [serviceName, def] of Object.entries(raw.services)) {
        for (const dep of def.depends_on ?? []) {
            if (!serviceKeys.has(dep)) {
                throw new Error(
                    `Error: Service '${dep}' listed in ${serviceName}.depends_on but not defined in services`,
                );
            }
        }
    }

    // ── Step 3: Build forward graph ──────────────────────────────────────────
    const servicesMap = new Map<string, ServiceNode>();

    for (const [id, def] of Object.entries(raw.services)) {
        if (!def.prometheus_labels || Object.keys(def.prometheus_labels).length === 0) {
            console.warn(
                `Warning: Service '${id}' has no prometheus_labels defined. ` +
                    `correlate_node will not be able to resolve this service from metric streams.`,
            );
        }

        servicesMap.set(id, {
            id,
            displayName: def.display_name ?? id,
            dependsOn: def.depends_on ?? [],
            dependents: [], // computed in Step 4
            prometheusLabels: def.prometheus_labels ?? {},
        });
    }

    // ── Step 4: Detect circular dependencies (before building dependents) ────
    detectCycles(servicesMap);

    // ── Step 5: Compute reverse graph (dependents) ───────────────────────────
    // For each service A, for each B in A.dependsOn → add A to B.dependents
    for (const node of servicesMap.values()) {
        for (const depId of node.dependsOn) {
            servicesMap.get(depId)!.dependents.push(node.id);
        }
    }

    return new TopologyGraphImpl(servicesMap);
}
