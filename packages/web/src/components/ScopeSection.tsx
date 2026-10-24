export default function ScopeSection() {
  return (
    <section id="principles" className="py-section-desktop px-4 sm:px-6 border-t border-outline-variant bg-surface relative transition-colors duration-300">
      <div className="max-w-max-width mx-auto section-reveal space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-outline-variant rounded-full bg-surface-container/60">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span className="font-mono text-[11px] font-semibold text-primary-container tracking-wider uppercase">
              Design Principles
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface">
            Calm, causal clarity. Zero alert noise.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Engineered to eliminate alert fatigue without sacrificing observability depth. 
            Vigil replaces frantic scramble with structured, deterministic synthesis.
          </p>
        </div>

        {/* Editorial Visual Comparison Card in Double-Bezel Frame */}
        <div className="p-2 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md max-w-5xl mx-auto">
          <div className="bg-white dark:bg-[#111318] rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* Left Column: Raw Alert Storm (Muted Monochrome Slate) */}
            <div className="bg-[#f4f4f6] dark:bg-[#15171e] border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-5 flex flex-col justify-between space-y-4 font-mono text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">notifications_active</span>
                    Raw Alert Storm
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-on-surface-variant font-bold text-[10px]">
                    40+ fragmented pages
                  </span>
                </div>

                {/* Chaotic Staggered Notification Stack */}
                <div className="space-y-2 relative pt-1">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                      <span className="text-on-surface font-semibold text-[11px]">PostgresPoolExhausted</span>
                      <span className="text-on-surface-variant text-[10px]">replica-0</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant shrink-0">14:02:11</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between translate-x-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-on-surface font-semibold text-[11px]">AuthServiceHttp500Spike</span>
                      <span className="text-on-surface-variant text-[10px]">auth-3</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant shrink-0">14:02:14</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between translate-x-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-on-surface font-semibold text-[11px]">PaymentWebhookTimeout</span>
                      <span className="text-on-surface-variant text-[10px]">checkout</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant shrink-0">14:02:18</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between translate-x-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant" />
                      <span className="text-on-surface font-semibold text-[11px]">GatewayHighLatencyP99</span>
                      <span className="text-on-surface-variant text-[10px]">ingress</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant shrink-0">14:02:22</span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-center text-[10px] text-on-surface-variant">
                    + 36 more uncoordinated alerts flooding 6 Slack channels...
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-on-surface-variant font-sans pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                On-call engineers frantic at 2:00 AM triaging noisy cascades without topology visibility.
              </div>
            </div>

            {/* Right Column: Vigil Causal Synthesis (Elevated Pure-White Surface + Subtle Warm Glow) */}
            <div className="bg-white dark:bg-[#1a1d26] border border-primary-container/30 rounded-xl p-5 flex flex-col justify-between space-y-4 font-mono text-xs relative overflow-hidden shadow-sm">
              {/* Subtle Warm Ambient Glow */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary-container">hub</span>
                    Vigil Causal Synthesis
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary-container/15 text-primary-container font-bold text-[10px]">
                    1 Atomic Incident
                  </span>
                </div>

                {/* Structured Incident Card */}
                <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#14161f] border border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                      <span>🚨</span>
                      <span>INC-8902: Database Connection Saturation</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-error/15 text-error font-bold text-[9px]">
                      ROOT CAUSE
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                    Topology BFS isolated <strong>postgres-primary:5432</strong> as upstream origin. 40 downstream cascade alerts collapsed into 1 thread.
                  </p>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e202a] border border-black/[0.06] dark:border-white/[0.08] text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-primary-container font-semibold">
                      <span>📖 runbooks/postgres-pool-saturation.md</span>
                      <span className="text-emerald-500 font-bold">94% RAG match</span>
                    </div>
                    <div className="text-on-surface-variant font-mono">
                      $ kubectl scale deployment/pgbouncer --replicas=4
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#F97316] to-[#D97706] text-white font-semibold text-[11px] shadow-xs hover:brightness-105 active:scale-95 transition-all">
                      Scale PgBouncer (+200)
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#20232c] border border-black/10 dark:border-white/10 text-on-surface font-semibold text-[11px] hover:bg-[#f9fafb] dark:hover:bg-[#282b36] active:scale-95 transition-all">
                      Rollback v2.14.0
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-on-surface-variant font-sans pt-2 border-t border-black/[0.04] dark:border-white/[0.04] relative z-10">
                Delivered to 1 single Slack thread with verified root-cause hypothesis and instant 1-click mitigation.
              </div>
            </div>
          </div>
        </div>

        {/* 3 Numbered Principles: Crisp 3-Column Architectural Bento Grid with 1px Hairline Separators */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-[1px]">
          <div className="bg-white dark:bg-[#111318] p-6 sm:p-8 space-y-3">
            <div className="font-mono text-xs text-primary-container font-bold uppercase tracking-wider">
              01 / Deterministic Foundation
            </div>
            <h4 className="font-bold text-base text-on-surface">Graph Traversal First</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
              We never ask an LLM to guess service dependencies. Topology correlation and settle debouncing are strictly deterministic mathematical algorithms.
            </p>
          </div>

          <div className="bg-white dark:bg-[#111318] p-6 sm:p-8 space-y-3">
            <div className="font-mono text-xs text-primary-container font-bold uppercase tracking-wider">
              02 / Grounded RAG
            </div>
            <h4 className="font-bold text-base text-on-surface">Zero Hallucinations</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
              Remediation steps are strictly grounded against your private ChromaDB runbooks. The AI agent cites the exact runbook doc and execution command.
            </p>
          </div>

          <div className="bg-white dark:bg-[#111318] p-6 sm:p-8 space-y-3">
            <div className="font-mono text-xs text-primary-container font-bold uppercase tracking-wider">
              03 / Non-Invasive
            </div>
            <h4 className="font-bold text-base text-on-surface">Zero Telemetry Lock-In</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
              No proprietary host agents. Vigil plugs directly into your existing Prometheus Alertmanager, Grafana OnCall, AWS CloudWatch, and Datadog webhooks.
            </p>
          </div>
        </div>

        {/* Production Readiness Callout */}
        <div className="max-w-5xl mx-auto border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-6 bg-white dark:bg-[#111318] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container flex-shrink-0">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-on-surface">Production Ready</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  STABLE
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-sans">
                Full-featured SRE Command Center, LangGraph 6-node state machine, and ChromaDB vector RAG active in production.
              </p>
            </div>
          </div>

          <a
            href="https://github.com/rajpreet-s/vigil/deployments/production"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#16181f] text-xs font-mono font-semibold text-on-surface flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[#fafafa] dark:hover:bg-[#1c1e26] transition-all"
          >
            <span>View Release Notes</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
      </div>
    </section>
  );
}
