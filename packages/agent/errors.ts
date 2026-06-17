// ─── Agent Error ──────────────────────────────────────────────────────────────
//
// All node-level failures should throw AgentError rather than a plain Error.
// This lets the graph boundary in graph.ts distinguish a known, typed node
// failure (DB down, LLM timeout, …) from an unexpected framework/bug crash
// and handle them differently:
//   - AgentError  → log structured, mark incident as failed, do NOT rethrow
//   - Unknown err → rethrow so server.ts can log it and the process can decide

export type NodeName =
    | "load"
    | "correlate"
    | "retrieve"
    | "investigate"
    | "rca"
    | "notify"
    | "human_review";

export class AgentError extends Error {
    /** The graph node that threw this error. */
    public readonly node: NodeName;
    /** The original caught value (may be Error, Prisma error, string, …). */
    public readonly cause: unknown;

    constructor(node: NodeName, message: string, cause?: unknown) {
        super(`[${node}] ${message}`);
        this.name = "AgentError";
        this.node = node;
        this.cause = cause;
    }
}
