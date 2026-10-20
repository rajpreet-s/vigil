import { useState } from 'react';

interface PipelineNode {
  id: string;
  step: string;
  title: string;
  tag: string;
  duration: string;
  description: string;
  codeSnippet: string;
  stateOutput: string;
}

const PIPELINE_NODES: PipelineNode[] = [
  {
    id: 'load_alert',
    step: '01',
    title: 'Alert Ingestion & Normalization',
    tag: 'INGEST',
    duration: '4ms',
    description: 'Receives webhook payload from Alertmanager, Datadog, or CloudWatch. Normalizes tags, parses incident timestamps, and hydrates initial AgentState.',
    codeSnippet: `async function loadAlertNode(state: AgentState): Promise<Partial<AgentState>> {
  const { rawAlert } = state;
  const normalized = normalizeWebhookPayload(rawAlert);
  
  return {
    incidentId: normalized.fingerprint,
    service: normalized.labels.service,
    severity: normalized.labels.severity,
    startedAt: normalized.startsAt,
    status: 'INGESTED'
  };
}`,
    stateOutput: `{
  "incidentId": "inc-8902-db-pool",
  "service": "postgres-primary",
  "severity": "CRITICAL",
  "alerts_count": 40,
  "status": "INGESTED"
}`,
  },
  {
    id: 'correlate_topology',
    step: '02',
    title: 'Topological BFS Traversal',
    tag: 'GRAPH',
    duration: '12ms',
    description: 'Traverses the infrastructure dependency DAG using breadth-first search. Isolates true upstream origin and maps connected downstream blast radius.',
    codeSnippet: `async function correlateNode(state: AgentState): Promise<Partial<AgentState>> {
  const { service, topologyGraph } = state;
  const upstream = topologyGraph.findRootCauses(service);
  const blastRadius = topologyGraph.getDownstreamNodes(upstream[0]);

  return {
    rootCauseCandidate: upstream[0] || service,
    affectedServices: blastRadius,
    graphDepth: blastRadius.length
  };
}`,
    stateOutput: `{
  "rootCauseCandidate": "postgres-primary",
  "affectedServices": ["auth-service", "checkout-api", "api-gateway"],
  "unconnectedNoiseFiltered": ["analytics-worker"],
  "depth": 3
}`,
  },
  {
    id: 'investigate_telemetry',
    step: '03',
    title: 'Metric & Deployment Anomaly Scraper',
    tag: 'TELEMETRY',
    duration: '85ms',
    description: 'Queries Prometheus / metrics provider for anomaly deviations and checks Kubernetes GitOps audit logs for recent deployments or config updates.',
    codeSnippet: `async function investigateNode(state: AgentState): Promise<Partial<AgentState>> {
  const metrics = await queryPrometheusMetrics(state.rootCauseCandidate, '15m');
  const recentDeploys = await getRecentK8sRollouts(state.rootCauseCandidate);

  return {
    metricsAnomaly: metrics.connectionPoolSaturation > 0.95,
    recentRelease: recentDeploys[0] || null
  };
}`,
    stateOutput: `{
  "metricsAnomaly": true,
  "activeConnections": 198,
  "maxConnections": 200,
  "recentDeployment": "v2.14.0 (deployed 8m ago by @platform-bot)",
  "restarts_15m": 2
}`,
  },
  {
    id: 'runbook_retrieval',
    step: '04',
    title: 'ChromaDB Vector Runbook RAG',
    tag: 'VECTOR RAG',
    duration: '24ms',
    description: 'Converts incident error signatures into dense vector embeddings and queries ChromaDB. Retrieves verified mitigation runbooks with cosine similarity &gt; 0.90.',
    codeSnippet: `async function retrievalNode(state: AgentState): Promise<Partial<AgentState>> {
  const query = \`\${state.service} \${state.rawAlert.annotations.summary}\`;
  const runbooks = await chromaVectorStore.similaritySearch(query, { k: 2 });

  return {
    matchedRunbooks: runbooks.map(doc => ({
      title: doc.metadata.title,
      confidence: doc.score,
      remediationSteps: doc.metadata.steps
    }))
  };
}`,
    stateOutput: `{
  "matchedRunbooks": [
    {
      "title": "runbooks/postgres-pool-saturation.md",
      "confidence": 0.94,
      "recommendedAction": "Scale pgbouncer replicas & kill idle connections"
    }
  ]
}`,
  },
  {
    id: 'synthesize_rca',
    step: '05',
    title: 'Gemini 3.8 Flash Causal Synthesis',
    tag: 'AI RCA',
    duration: '340ms',
    description: 'Runs high-speed causal synthesis using Gemini 3.8 Flash. Combines topology, metric anomalies, and runbook steps into an executive diagnosis.',
    codeSnippet: `async function rcaNode(state: AgentState): Promise<Partial<AgentState>> {
  const prompt = buildCausalPrompt(state);
  const response = await geminiFlash.generateObject({
    schema: RCASynthesisSchema,
    prompt
  });

  return {
    diagnosis: response.summary,
    rootCause: response.rootCause,
    confidence: response.confidence,
    remediationCommand: response.suggestedFix
  };
}`,
    stateOutput: `{
  "rootCause": "Postgres connection pool saturation caused by unindexed query in v2.14.0",
  "confidence": 0.96,
  "blastRadius": "HIGH",
  "suggestedFix": "kubectl rollout undo deployment/auth-service"
}`,
  },
  {
    id: 'human_dispatch',
    step: '06',
    title: 'Human-in-the-Loop Slack & Web Dispatch',
    tag: 'DISPATCH',
    duration: '18ms',
    description: 'Posts structured Block-Kit Slack card with 1-click approval buttons and streams live state updates to the Vigil SRE Incident Command Console.',
    codeSnippet: `async function dispatchNode(state: AgentState): Promise<void> {
  await slackClient.sendIncidentCard({
    channel: '#sre-incidents',
    incident: state,
    actions: ['Approve Rollback', 'Execute Runbook', 'Silence 1hr']
  });

  webSocketServer.broadcastIncidentUpdate(state.incidentId, state);
}`,
    stateOutput: `{
  "slackMessageTs": "1719203841.002300",
  "channel": "#sre-incidents",
  "websocketSubscribers": 4,
  "status": "AWAITING_HUMAN_APPROVAL"
}`,
  },
];

export default function HowItWorksSection() {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(4); // Default to RCA node
  const activeNode = PIPELINE_NODES[selectedNodeIndex];

  return (
    <section id="pipeline" className="py-section-desktop px-4 sm:px-6 relative transition-colors duration-300">
      <div className="max-w-max-width mx-auto section-reveal space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-outline-variant rounded-full bg-surface-container/60 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span className="font-mono text-[11px] font-semibold text-primary-container tracking-wider uppercase">
              Agent Pipeline
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface mb-4">
            LangGraph 6-Node State Machine
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Every incoming alert triggers an orchestrated, deterministic agent pipeline. 
            Telemetry grounding, graph traversal, ChromaDB runbook retrieval, and Gemini 3.8 Flash causal synthesis execute in sub-second parallel passes.
          </p>
        </div>

        {/* 6-Step Stepper Rail */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_NODES.map((node, index) => {
            const isSelected = index === selectedNodeIndex;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeIndex(index)}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'border-primary-container bg-surface-container shadow-sm'
                    : 'border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isSelected ? 'text-primary-container' : 'text-on-surface-variant'
                    }`}
                  >
                    STEP {node.step}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    {node.duration}
                  </span>
                </div>
                <div className="font-bold text-xs text-on-surface truncate group-hover:text-primary-container transition-colors">
                  {node.title.split(' ')[0]} {node.title.split(' ')[1]}
                </div>
                <div className="text-[10px] font-mono text-on-surface-variant mt-1">
                  [{node.tag}]
                </div>
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container" />
                )}
              </button>
            );
          })}
        </div>

        {/* Node Deep Dive Workbench in Double-Bezel Frame */}
        <div className="p-2 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md">
          <div className="bg-white dark:bg-[#111318] rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Top Header */}
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#f9fafb] dark:bg-[#16181f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-primary-container/15 text-primary-container font-mono text-xs font-bold flex items-center justify-center">
                {activeNode.step}
              </span>
              <div>
                <h3 className="font-bold text-base text-on-surface">{activeNode.title}</h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  Node ID: <code className="text-primary-container">{activeNode.id}</code> • Execution: {activeNode.duration}
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-primary-container/10 border border-primary-container/30 text-primary-container">
              {activeNode.tag}
            </span>
          </div>

          {/* Node Description & Two Panels: Code + State Output with Tab Blur Transition */}
          <div key={activeNode.id} className="p-6 sm:p-8 space-y-6 animate-tab-blur">
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-4xl">
              {activeNode.description}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Code Panel (7 cols) */}
              <div className="lg:col-span-7 border border-outline-variant rounded-xl bg-surface-container-low overflow-hidden">
                <div className="px-4 py-2 border-b border-outline-variant/60 flex items-center justify-between text-xs font-mono text-on-surface-variant bg-surface-container">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-error/50" />
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container/50" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    <span className="ml-1">nodes/{activeNode.id}.ts</span>
                  </span>
                  <span>TypeScript</span>
                </div>
                <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-on-surface">
                  <pre className="text-on-surface-variant">
                    <code>{activeNode.codeSnippet}</code>
                  </pre>
                </div>
              </div>

              {/* State Output Panel (5 cols) */}
              <div className="lg:col-span-5 border border-outline-variant rounded-xl bg-surface-container-low overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-outline-variant/60 flex items-center justify-between text-xs font-mono text-on-surface-variant bg-surface-container">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary-container">data_object</span>
                    AgentState Output
                  </span>
                  <span className="text-[10px] text-emerald-500 font-semibold">VALIDATED</span>
                </div>
                <div className="p-4 flex-1 overflow-x-auto text-xs font-mono leading-relaxed bg-surface-container-lowest/50 text-primary-container">
                  <pre className="text-on-surface">
                    <code>{activeNode.stateOutput}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
