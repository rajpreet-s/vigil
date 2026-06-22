import { AgentStateSchema } from '../agentStateSchema.js';
import { logger } from '../../shared/index.js';
import { queryRunbooks } from '../chroma/runbooks.js';

const log = logger.child({ context: 'retrieval_node' });

// ─── retrieval_node ───────────────────────────────────────────────────────────
//
// Fetches the most relevant runbooks from ChromaDB for the root cause candidate.
//
// The query text is a natural-language sentence describing the incident context
// (service + metric name). ChromaDB embeds this and returns the semantically
// closest runbook chunks, which the rca_node injects into its LLM prompt to
// answer: "what broke, what caused it, did we cause it, what do I do".
//
// Returns: runbookChunks — [{content, metadata}] written to state so rca_node
// can access them without re-querying Chroma.

export async function retrieval_node(
    state: typeof AgentStateSchema.State
): Promise<Partial<typeof AgentStateSchema.State>> {
    const { rootCauseCandidate } = state;

    // If there is no candidate yet, we have nothing to search for.
    // Return an empty result and let rca_node handle it with what it has.
    if (!rootCauseCandidate) {
        log.warn('retrieval_node: no rootCauseCandidate — skipping runbook retrieval');
        return { runbookChunks: [] };
    }

    const { service_name: serviceName, metric_name: metricName } = rootCauseCandidate;

    // Build a descriptive query sentence rather than passing a raw metric name.
    // The embedding model needs natural language to find semantically relevant
    // runbooks — "http_request_duration_seconds" alone is a poor query.
    const incidentContext = `high/ medium ${metricName} anomaly detected on service ${serviceName}`;

    log.info(
        { serviceName, metricName, incidentContext },
        'retrieval_node: querying runbooks'
    );

    try {
        const results = await queryRunbooks(incidentContext, serviceName);

        // ChromaDB returns parallel arrays: documents[0] and metadatas[0] are
        // the results for our single queryText. Zip them into typed objects.
        const documents = results.documents?.[0] ?? [];
        const metadatas  = results.metadatas?.[0]  ?? [];

        const runbookChunks = documents.map((content, idx) => ({
            content,
            metadata: metadatas[idx] ?? null,
        }));

        log.info(
            { count: runbookChunks.length, serviceName },
            'retrieval_node: runbooks retrieved'
        );

        return { runbookChunks };
    } catch (err) {
        // Retrieval failure is non-fatal — rca_node can still run without
        // runbooks, it will just have less context to reason from.
        log.error(
            { serviceName, metricName, err },
            'retrieval_node: runbook query failed — returning empty chunks'
        );
        return { runbookChunks: [] };
    }
}
