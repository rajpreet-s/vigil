import { useState } from 'react';

type ArchTab = 'graph' | 'rag' | 'settle';

export default function TopologySection() {
  const [activeTab, setActiveTab] = useState<ArchTab>('graph');

  return (
    <section
      id="architecture"
      className="bg-surface py-section-desktop px-4 sm:px-6 border-y border-outline-variant relative overflow-hidden transition-colors duration-300"
    >
      {/* Subtle background ambient mesh */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-max-width mx-auto relative z-10 section-reveal space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-outline-variant rounded-full bg-surface-container/60 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span className="font-mono text-[11px] font-semibold text-primary-container tracking-wider uppercase">
              Core Architecture
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface mb-4">
            Timestamps lie. Topology doesn't.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Grouping alerts simply because they fired around the same second causes false merges and alert chaos. 
            Vigil traverses your service dependency graph mathematically to isolate true upstream root causes from incidental downstream fallout.
          </p>
        </div>

        {/* Interactive Architecture Workbench (Double-Bezel Bento Hero) */}
        <div className="relative">
          {/* Large Ultra-Soft Radial Backlight Glow */}
          <div className="absolute -inset-10 sm:-inset-16 -z-10 pointer-events-none overflow-visible">
            <div className="absolute -inset-6 rounded-[48px] bg-gradient-to-tr from-[#EA580C]/18 via-[#F59E0B]/18 to-transparent blur-[120px] dark:from-[#EA580C]/24 dark:via-[#F59E0B]/18 dark:to-transparent" />
          </div>

          <div className="p-2 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md">
            <div className="bg-white dark:bg-[#111318] rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
              {/* Top Bar with Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-4 sm:px-6 py-3 bg-[#f9fafb] dark:bg-[#16181f] gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-lg">schema</span>
                  <span className="font-mono text-xs font-semibold text-on-surface uppercase tracking-wider">
                    Vigil Engine Architecture
                  </span>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-[#f0f1f4] dark:bg-[#0c0e12] border border-black/[0.06] dark:border-white/[0.08] p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('graph')}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                      activeTab === 'graph'
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    1. Graph Traversal (BFS)
                  </button>
                  <button
                    onClick={() => setActiveTab('rag')}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                      activeTab === 'rag'
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    2. ChromaDB Runbook RAG
                  </button>
                  <button
                    onClick={() => setActiveTab('settle')}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                      activeTab === 'settle'
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    3. Settle Timer Sliding Window
                  </button>
                </div>
              </div>

              {/* Tab Content Display with Tab Blur Transition */}
              <div key={activeTab} className="p-6 sm:p-8 animate-tab-blur">
            {activeTab === 'graph' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-primary-container font-semibold">
                    <span className="material-symbols-outlined text-sm">hub</span>
                    Directed Acyclic Graph Reachability
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                    Upstream Root Cause Discovery
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    When <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs text-error">postgres-primary</code> saturates connection pools, downstream alerts fire in rapid succession: auth timeouts, API gateway 502s, and checkout checkout failures.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Vigil executes breadth-first traversal (<code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs text-primary-container">BFS</code>) on the service topology to locate the single upstream root vertex. Unconnected background jobs firing simultaneously (<code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs">analytics-worker</code>) are isolated into a separate incident scope.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      Edge Discovery: O(V + E)
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      Cycle Detection: Kahn's Algo
                    </span>
                  </div>
                </div>

                {/* Graph Visualization Mockup */}
                <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-outline-variant/60 text-xs font-mono text-on-surface-variant">
                    <span>TOPOLOGY ADJACENCY MATRIX</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Graph In-Sync
                    </span>
                  </div>

                  <div className="py-6 flex flex-col items-center gap-4">
                    {/* Root Cause Node */}
                    <div className="w-full max-w-xs border-2 border-error/70 bg-error/10 rounded-xl p-3 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-error text-lg">database</span>
                        <div>
                          <div className="font-mono text-xs font-bold text-on-surface">postgres-primary</div>
                          <div className="text-[10px] text-error font-medium">ROOT CAUSE • High Connections</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-error text-white font-mono text-[10px] font-bold">
                        ORIGIN
                      </span>
                    </div>

                    {/* Downward Connectors */}
                    <div className="flex items-center gap-8 text-on-surface-variant/40">
                      <span className="material-symbols-outlined text-base">arrow_downward</span>
                      <span className="text-[10px] font-mono text-on-surface-variant">BFS Edge (Depth: 1)</span>
                      <span className="material-symbols-outlined text-base">arrow_downward</span>
                    </div>

                    {/* Intermediate Layer */}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                      <div className="border border-amber-500/40 bg-amber-500/10 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-500 text-sm">lock</span>
                          <span className="font-mono text-xs font-semibold text-on-surface">auth-service</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-1">DB Pool Exhausted (503)</div>
                      </div>

                      <div className="border border-amber-500/40 bg-amber-500/10 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-500 text-sm">shopping_cart</span>
                          <span className="font-mono text-xs font-semibold text-on-surface">checkout-api</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-1">Order Timeout (504)</div>
                      </div>
                    </div>

                    {/* Edge to Gateway */}
                    <div className="text-on-surface-variant/40">
                      <span className="material-symbols-outlined text-base">arrow_downward</span>
                    </div>

                    {/* Edge Gateway Node */}
                    <div className="w-full max-w-xs border border-outline-variant bg-surface-container rounded-lg p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">dns</span>
                        <span className="font-mono text-xs text-on-surface">api-gateway</span>
                      </div>
                      <span className="text-[10px] font-mono text-on-surface-variant">Downstream Impact</span>
                    </div>
                  </div>

                  {/* Isolated Node Badge */}
                  <div className="mt-2 pt-3 border-t border-outline-variant/60 flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-mono text-[11px] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-outline">do_not_disturb_on</span>
                      Isolated Vertex: <code className="text-on-surface font-semibold">analytics-worker</code> (0 connected edges)
                    </span>
                    <span className="text-[10px] font-mono text-primary-container uppercase font-semibold">Discarded from group</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rag' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-primary-container font-semibold">
                    <span className="material-symbols-outlined text-sm">library_books</span>
                    ChromaDB Vector Runbook Retrieval
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                    Instant Runbook Grounding
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    AI hallucination is fatal during an outage. Vigil does not improvise shell commands. Instead, it embeds the incident error signatures and queries your private ChromaDB vector database.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    The top-matching verified operational runbooks are retrieved, ranked by cosine similarity, and fed directly into the RCA synthesis agent with step-by-step mitigation commands.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      ChromaDB In-Cluster
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      Cosine Distance &lt; 0.12
                    </span>
                  </div>
                </div>

                {/* Vector Match Preview */}
                <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60 text-on-surface-variant">
                    <span>EMBEDDING QUERY VECTOR</span>
                    <span className="text-primary-container">dim: 1536</span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-container border border-outline-variant text-on-surface">
                    <span className="text-primary-container font-bold">QUERY: </span>
                    "Postgres connection pool exhausted max_client_conn 200 reached auth-service"
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">
                      Ranked Runbook Matches
                    </div>

                    {/* Match 1 */}
                    <div className="p-3 rounded-lg bg-surface-container border border-primary-container/40 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary-container text-sm">description</span>
                          <span className="font-bold text-on-surface">runbooks/postgres-pool-saturation.md</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant font-sans">
                          Remediation: Increase pgbouncer client limit, cycle stagnant pool connections, restart read replica.
                        </p>
                        <div className="text-[11px] text-primary-container font-mono pt-1">
                          $ pgbouncer-ctl pause &amp;&amp; kubectl scale deploy/pgbouncer --replicas=4
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-primary-container/15 text-primary-container font-bold text-[10px]">
                        0.94 CONFIDENCE
                      </span>
                    </div>

                    {/* Match 2 */}
                    <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/60 flex items-start justify-between opacity-70">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-sm">description</span>
                          <span className="font-bold text-on-surface">runbooks/rds-failover-procedure.md</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant font-sans">
                          Multi-AZ standby failover triggered via AWS CLI.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-bold text-[10px]">
                        0.76 CONFIDENCE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settle' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-primary-container font-semibold">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    Dynamic Settle Debouncing
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                    Zero Alarm Floods
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    During a major service outage, monitoring tools emit dozens of redundant alerts per minute. 
                    Rather than paging the on-call engineer 40 individual times, Vigil's <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs">IncidentCoordinator</code> initiates a sliding settle timer.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    The settle window (configurable 15s to 60s) dynamically collects cascade alerts. Once the flurry stabilizes, a single atomic root-cause incident is dispatched.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      Debounce Window: 15s Settle
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      Max Wait Cap: 5m
                    </span>
                  </div>
                </div>

                {/* Settle Timeline Diagram */}
                <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-6 font-mono text-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60 text-on-surface-variant">
                    <span>TEMPORAL DEBOUNCE TIMELINE</span>
                    <span className="text-emerald-500 font-bold">40 Alerts → 1 Incident</span>
                  </div>

                  <div className="space-y-3">
                    {/* Event 1 */}
                    <div className="flex items-center gap-3">
                      <span className="text-primary-container font-bold text-[11px] w-12">t = 0.0s</span>
                      <div className="flex-1 p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between">
                        <span>Alert #1 received (<code className="text-error">pg-pool-exhausted</code>)</span>
                        <span className="text-[10px] text-primary-container">Start 15s Settle</span>
                      </div>
                    </div>

                    {/* Event 2 */}
                    <div className="flex items-center gap-3">
                      <span className="text-primary-container font-bold text-[11px] w-12">t = 3.4s</span>
                      <div className="flex-1 p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between">
                        <span>Alerts #2 - #14 burst (<code className="text-amber-500">auth 500s</code>)</span>
                        <span className="text-[10px] text-amber-500">Timer Reset (15s)</span>
                      </div>
                    </div>

                    {/* Event 3 */}
                    <div className="flex items-center gap-3">
                      <span className="text-primary-container font-bold text-[11px] w-12">t = 7.1s</span>
                      <div className="flex-1 p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between">
                        <span>Alerts #15 - #40 burst (<code className="text-amber-500">gateway 504s</code>)</span>
                        <span className="text-[10px] text-amber-500">Timer Reset (15s)</span>
                      </div>
                    </div>

                    {/* Event 4: Window Expires */}
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-500 font-bold text-[11px] w-12">t = 22.1s</span>
                      <div className="flex-1 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Silence Window Settled → Batch Dispatched to LangGraph
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">1 PAGE ONLY</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

        {/* 3 Bespoke Architecture Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-outline-variant rounded-xl p-6 bg-surface-container-low hover:border-outline transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">security</span>
            </div>
            <h4 className="font-bold text-base text-on-surface">100% Air-Gapped &amp; Private</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your service topologies, runbooks, metrics, and incident histories never leave your private VPC or Kubernetes cluster. LLM causal synthesis can run via self-hosted Ollama/vLLM or Gemini Vertex AI with zero telemetry retention.
            </p>
          </div>

          <div className="border border-outline-variant rounded-xl p-6 bg-surface-container-low hover:border-outline transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">cable</span>
            </div>
            <h4 className="font-bold text-base text-on-surface">Multi-Provider Ingestion</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Standardized webhook endpoints for Prometheus Alertmanager, Grafana OnCall, AWS CloudWatch, Datadog, and custom Webhooks. Ingests raw JSON payloads, maps tags automatically, and attaches Prometheus query links.
            </p>
          </div>

          <div className="border border-outline-variant rounded-xl p-6 bg-surface-container-low hover:border-outline transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">touch_app</span>
            </div>
            <h4 className="font-bold text-base text-on-surface">Human-in-the-Loop Actions</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              AI suggests, humans decide. Interactive Slack Block-Kit notifications and Web Console allow on-call engineers to approve automated rollbacks, execute verified runbook remediation scripts, or silence alerts with a single click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
