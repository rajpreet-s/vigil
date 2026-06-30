import { StateGraph, START, END, isGraphInterrupt } from '@langchain/langgraph';
import { initTopology } from './startup.js';
import { logger } from '../shared/index.js';
import { AgentStateSchema } from './agentStateSchema.js';
import { load_node } from './nodes/load_node.js';
import { AgentError } from './errors.js';
import { prisma } from './prisma.js';
import { IncidentStatus } from '@prisma/client';
import { correlate_node } from './nodes/correlate_node.js';
import { retrieval_node } from './nodes/retrieval_node.js';
import { investigate_node } from './nodes/investigate_node.js';
import { rca_node } from './nodes/rca_node.js';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { human_review_node } from './nodes/human_review_node.js';
import { notify_node } from './nodes/notify_node.js';

const graphLogger = logger.child({ context: 'graph' });

// ─── Graph definition ─────────────────────────────────────────────────────────

const builder = new StateGraph(AgentStateSchema)
    .addNode('load', load_node)
    .addNode('correlate', correlate_node)
    .addNode('retrieval', retrieval_node)
    .addNode('investigate', investigate_node)
    .addNode('rca', rca_node)
    .addNode('human_review', human_review_node)
    .addNode('notify_node', notify_node)

    .addEdge(START, 'load')
    .addEdge('load', 'correlate')

    // After correlation, branch on confidence:
    //   LOW    → investigate first (extra LLM reasoning to resolve ambiguity),
    //            then retrieval so rca_node still gets runbooks
    //   MEDIUM/HIGH → skip investigate, go straight to retrieval
    //
    // retrieval always runs before END so rca_node has runbook context
    // regardless of which branch was taken.
    .addConditionalEdges('correlate', (state) => {
        return state.confidence === 'LOW' ? 'investigate' : 'retrieval';
    })
    .addEdge('investigate', 'retrieval')
    .addEdge('retrieval', 'rca')
    .addEdge('rca', 'human_review')
    .addConditionalEdges('human_review', (state: typeof AgentStateSchema.State) => {
        return state.humanDecision === 'approved' ? 'notify_node' : END;
    })
    .addEdge('notify_node', END);

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL || '', {
    schema: 'vigil',
});

// NOTE: checkpointer.setup() is intentionally NOT called here.
// Calling await at module top-level executes during `import`, before the
// server is ready and before the PG pool is warmed. It is moved into initAgent().

export const graph = builder.compile({ checkpointer });

// ─── Boot function ────────────────────────────────────────────────────────────
// Called ONCE when the agent container starts, before accepting any requests.
// Parses topology.yaml and upserts edges into the DB so every graph run can
// read topology rows directly from Postgres without re-parsing YAML.

export async function initAgent(): Promise<void> {
    // Set up checkpointer tables in Postgres before any graph run.
    // This is safe here because the DB pool is already open by the time
    // server.ts calls initAgent().
    await checkpointer.setup();
    graphLogger.info('Agent booting — initialising topology...');
    await initTopology();
    graphLogger.info('Agent ready.');
}

// ─── Per-incident trigger ─────────────────────────────────────────────────────
// Called by the HTTP server once per incident when the settle timer fires.
// Sets the LangGraph thread_id to the incidentId so checkpoints are namespaced
// per incident and the graph can be resumed if it crashes mid-run.
//
// Error handling contract:
//   AgentError  → known, typed node failure; log structured + mark DB as failed.
//                 Do NOT rethrow — the incident has been recorded.
//   Unknown err → unexpected crash (framework bug, OOM, …); rethrow so
//                 server.ts can log it at ERROR level as an unhandled exception.

export async function runIncidentAnalysis(incidentId: string): Promise<void> {
    graphLogger.info({ incidentId }, 'Starting incident analysis graph run');

    try {
        await graph.invoke({ incidentId }, { configurable: { thread_id: incidentId } });

        graphLogger.info({ incidentId }, 'Incident analysis graph run complete');
    } catch (err) {
        if (isGraphInterrupt(err)) {
            // ── Human-in-the-loop suspend ─────────────────────────────────────
            // LangGraph throws a GraphInterrupt when interrupt() is called inside
            // human_review_node. This is EXPECTED behaviour — the graph has been
            // checkpointed to Postgres and is waiting for the on-call engineer's
            // Slack button click. It is not an error.
            graphLogger.info(
                { incidentId },
                'Graph suspended at human_review — awaiting Slack decision'
            );
        } else if (err instanceof AgentError) {
            // ── Known, typed node failure ──────────────────────────────────────
            // Log with full structured context so we know exactly which node
            // failed and why, then write the failed status to the incidents table
            // so the incident is not left in a permanently "pending" state.
            graphLogger.error(
                {
                    incidentId,
                    node: err.node,
                    message: err.message,
                    cause: err.cause instanceof Error ? err.cause.message : String(err.cause ?? ''),
                },
                'Graph run aborted: node threw AgentError'
            );

            await markIncidentFailed(incidentId, err.message);
        } else {
            // ── Unexpected crash ───────────────────────────────────────────────
            // Do not swallow — rethrow so server.ts .catch() surfaces it as an
            // unhandled exception with its own ERROR log entry.
            graphLogger.error({ incidentId, err }, 'Graph run crashed unexpectedly');
            throw err;
        }
    }
}

// ─── markIncidentFailed ───────────────────────────────────────────────────────
// Writes failure status back to Postgres so the incident is never left
// silently pending. The `reason` is stored for dashboard / on-call visibility.

async function markIncidentFailed(incidentId: string, reason: string): Promise<void> {
    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status: IncidentStatus.FAILED,
                failure_reason: reason,
            },
        });
    } catch (dbErr) {
        // If even the failure-write fails, log it — do not throw. The original
        // AgentError has already been logged above with full context.
        graphLogger.error(
            { incidentId, dbErr },
            'markIncidentFailed: could not write failure status to DB'
        );
    }
}
