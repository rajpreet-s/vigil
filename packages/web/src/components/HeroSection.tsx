import { useState, useEffect } from 'react';
import posthog from 'posthog-js';

type HeroTab = 'collapse' | 'graph' | 'dag' | 'slack';

const TABS: { id: HeroTab; label: string; icon: string; iconColor: string }[] = [
  { id: 'collapse', label: '1. 40 ➔ 1 Collapse', icon: 'compress', iconColor: 'text-primary-container' },
  { id: 'graph', label: '2. Causal Path', icon: 'account_tree', iconColor: 'text-amber-500' },
  { id: 'dag', label: '3. Agent Trace DAG', icon: 'psychology', iconColor: 'text-primary-container' },
  { id: 'slack', label: '4. Slack Dispatch', icon: 'mark_chat_read', iconColor: 'text-sky-500' },
];

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState<HeroTab>('collapse');
  const [isPaused, setIsPaused] = useState(false);

  // Automatic 4-second cycling walkthrough that pauses on hover/interaction
  useEffect(() => {
    if (isPaused) return;
    const tabKeys: HeroTab[] = ['collapse', 'graph', 'dag', 'slack'];
    const timer = setInterval(() => {
      setActiveTab((curr) => {
        const nextIdx = (tabKeys.indexOf(curr) + 1) % tabKeys.length;
        return tabKeys[nextIdx];
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const getAppUrl = () => {
    const isLight = typeof document !== 'undefined' && 
      (document.documentElement.getAttribute('data-theme') === 'light' || !document.documentElement.classList.contains('dark'));
    const currentTheme = isLight ? 'light' : 'dark';
    if (typeof window === 'undefined') return `/app/login?theme=${currentTheme}`;
    if (window.location.port === '3002') return `http://localhost:3000/login?theme=${currentTheme}`;
    if (window.location.port === '5174') return `http://localhost:5173/login?theme=${currentTheme}`;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:3000/login?theme=${currentTheme}`;
    }
    return `/app/login?theme=${currentTheme}`;
  };

  const handleGetStarted = () => {
    posthog.capture('get_started_clicked', { location: 'hero' });
    window.location.href = getAppUrl();
  };

  const handleGitHubClick = () => {
    posthog.capture('github_link_clicked', { location: 'hero' });
  };

  return (
    <section className="lantern-bg relative pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden px-4 sm:px-6 transition-colors duration-300 border-b border-outline-variant/50">
      {/* Ambient background liquid glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="liquid-glass-container">
          <div className="liquid-blob liquid-blob-1" />
          <div className="liquid-blob liquid-blob-2" />
          <div className="liquid-blob liquid-blob-3" />
        </div>
      </div>

      <div className="max-w-max-width mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10 section-reveal">
        {/* Left Column: Headline Copy & CTAs with Focus-Pull Entrance (5 cols) */}
        <div className="lg:col-span-5 text-left relative z-20 space-y-6">
          {/* Badge: Focus Pull */}
          <div className="animate-focus-pull inline-flex items-center gap-2 px-3 py-1 border border-outline-variant rounded-full bg-surface-container/80 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary-container pulse-dot" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-primary-container uppercase">
              Agentic SRE Copilot
            </span>
            <span className="text-secondary text-xs">•</span>
            <span className="font-mono text-[11px] text-on-surface-variant font-medium">
              Gemini 3.8 &amp; Alertmanager
            </span>
          </div>

          {/* Elevated Typography: Split H1 with Focus-Pull Delay 1 */}
          <h1 className="animate-focus-pull delay-focus-1 font-display text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-tight">
            <span className="text-[#111113] dark:text-[#EDEDF2] block">
              Alert storms, correlated.
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#EA580C] via-[#D97706] to-[#E11D48] block">
              Root causes isolated.
            </span>
          </h1>

          {/* Subheading: Focus-Pull Delay 2 */}
          <p className="animate-focus-pull delay-focus-2 text-base sm:text-lg text-on-surface-variant leading-relaxed font-normal max-w-xl">
            When a database failure triggers forty downstream alert notifications, Vigil traverses your service topology, queries ChromaDB runbooks, and synthesizes root causes with Gemini, delivered as one actionable Slack incident.
          </p>

          {/* Tactile Buttons: Focus-Pull Delay 3 */}
          <div className="animate-focus-pull delay-focus-3 flex flex-col sm:flex-row gap-3 pt-1 sm:items-center">
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-b from-[#F97316] to-[#D97706] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_rgba(234,88,12,0.25)] border border-[#C2410C]/80"
            >
              <span>Launch Incident Console</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <a
              href="https://github.com/rajpreet-s/vigil"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleGitHubClick}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-black/10 dark:border-white/10 rounded-xl text-sm font-medium text-[#181b22] dark:text-[#ededf2] bg-white dark:bg-[#16181f] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[#fafafa] dark:hover:bg-[#1c1e26] transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              <span>View on GitHub</span>
            </a>
          </div>

          {/* Key Metric Highlights: Focus-Pull Delay 4 */}
          <div className="animate-focus-pull delay-focus-4 pt-4 border-t border-outline-variant/60 grid grid-cols-3 gap-4 text-left">
            <div>
              <div className="text-xl font-bold font-display text-on-surface">40 ➔ 1</div>
              <div className="text-[11px] text-on-surface-variant font-mono">Alert Reduction</div>
            </div>
            <div>
              <div className="text-xl font-bold font-display text-on-surface">&lt; 15s</div>
              <div className="text-[11px] text-on-surface-variant font-mono">Settle Debounce</div>
            </div>
            <div>
              <div className="text-xl font-bold font-display text-on-surface">100%</div>
              <div className="text-[11px] text-on-surface-variant font-mono">Self-Hosted MIT</div>
            </div>
          </div>
        </div>

        {/* Right Column: Double-Bezel Interactive Console Mockup with Optical Depth-of-Field (7 cols) */}
        <div 
          className="lg:col-span-7 relative z-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Optical Depth-of-Field: Large Ultra-Soft Radial Backlight Glow */}
          <div className="absolute -inset-10 sm:-inset-16 -z-10 pointer-events-none overflow-visible">
            <div className="absolute -inset-6 rounded-[48px] bg-gradient-to-tr from-[#EA580C]/18 via-[#F59E0B]/18 to-transparent blur-[120px] dark:from-[#EA580C]/24 dark:via-[#F59E0B]/18 dark:to-transparent" />
          </div>

          {/* Lovable-style Diffused Aurora Mesh Glow */}
          <div className="absolute -inset-4 sm:-inset-8 -z-10 pointer-events-none opacity-45 dark:opacity-20 blur-3xl overflow-visible">
            <div className="absolute top-1/4 -left-12 w-72 h-72 rounded-full bg-[#FFEDD5] dark:bg-[#ea580c]" />
            <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full bg-[#FEF3C7] dark:bg-[#d97706]" />
            <div className="absolute -bottom-10 right-0 w-72 h-72 rounded-full bg-[#FFE4E6] dark:bg-[#e11d48]" />
          </div>

          {/* Double-Bezel Frame with Glassmorphism Refraction */}
          <div className="p-2 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md">
            <div className="bg-white dark:bg-[#111318] rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
              
              {/* Window Chrome Header Bar */}
              <div className="bg-[#f9fafb] dark:bg-[#16181f] px-4 py-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-error/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="h-3.5 w-px bg-outline-variant mx-1" />
                  <span className="font-mono text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Vigil Incident Command
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-error/10 text-error border border-error/20 uppercase">
                    Active Outage • INC-8902
                  </span>
                </div>
              </div>

              {/* Interactive Preview Sub-Tabs with Smooth Sliding Indicator */}
              <div className="bg-[#f4f5f7] dark:bg-[#14161d] px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1 overflow-x-auto terminal-scroll relative">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-1.5 relative z-10 ${
                        isActive
                          ? 'bg-white dark:bg-[#1c1e26] text-on-surface shadow-sm font-semibold border border-black/[0.06] dark:border-white/[0.08]'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[14px] ${tab.iconColor}`}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
                {/* Visual Auto-Cycle Active Indicator Pill */}
                <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] font-mono text-on-surface-variant/70 pr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                  <span>4s cycle</span>
                </div>
              </div>

              {/* Dynamic Tab Content Area with Smooth 250ms Blur-Transition */}
              <div 
                key={activeTab} 
                className="animate-tab-blur p-5 min-h-[340px] flex flex-col justify-between font-mono text-xs"
              >
                {/* Tab 1 (DEFAULT): Immediate "40 Alerts -> 1 Root Cause" Visual */}
                {activeTab === 'collapse' && (
                  <div className="space-y-4">
                    {/* Top Row: Visual Collapse from 40 Alerts to Root Cause */}
                    <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#161820] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant border-b border-black/[0.04] dark:border-white/[0.06] pb-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                          <span>Alertmanager Ingest Stream</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-primary-container/10 text-primary-container font-bold text-[10px]">
                          40 Alerts Collapsed (15s Settle)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Downstream Symptoms (5 cols) */}
                        <div className="sm:col-span-5 space-y-1.5">
                          <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                            Cascading Symptoms (40 Alerts)
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-[#1e2029] border border-black/[0.06] dark:border-white/[0.08] text-[11px] flex items-center justify-between shadow-xs">
                            <span className="text-on-surface truncate">order-service: 18x 504 timeouts</span>
                            <span className="text-amber-500 font-bold shrink-0">WARN</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-[#1e2029] border border-black/[0.06] dark:border-white/[0.08] text-[11px] flex items-center justify-between shadow-xs">
                            <span className="text-on-surface truncate">auth-service: 14x DB pool failures</span>
                            <span className="text-amber-500 font-bold shrink-0">WARN</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-[#1e2029] border border-black/[0.06] dark:border-white/[0.08] text-[11px] flex items-center justify-between shadow-xs">
                            <span className="text-on-surface truncate">api-gateway: 8x latency P99 &gt; 3.2s</span>
                            <span className="text-amber-500 font-bold shrink-0">WARN</span>
                          </div>
                        </div>

                        {/* Middle Collapse Vector (2 cols) */}
                        <div className="sm:col-span-2 flex flex-col items-center justify-center text-center py-1">
                          <span className="material-symbols-outlined text-primary-container text-xl animate-pulse">
                            arrow_forward
                          </span>
                          <span className="text-[9px] text-primary-container font-semibold mt-0.5">
                            BFS Path
                          </span>
                        </div>

                        {/* Upstream Root Cause: Razor Sharp (5 cols) */}
                        <div className="sm:col-span-5">
                          <div className="p-3.5 rounded-xl bg-error/5 dark:bg-error/10 border-2 border-error/60 shadow-md ring-1 ring-error/30 space-y-1.5 filter-none">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-error text-white font-bold text-[9px] tracking-wide">
                                ROOT ORIGIN
                              </span>
                              <span className="text-[10px] text-error font-bold">100% Saturation</span>
                            </div>
                            <div className="font-bold text-xs text-on-surface">
                              postgres-primary:5432
                            </div>
                            <div className="text-[11px] text-on-surface-variant font-sans leading-tight">
                              Connection pool exhausted at 200/200 limit following deploy <code className="text-primary-container font-mono">v2.14.0</code>.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Synthesized Slack Incident Card */}
                    <div className="p-4 rounded-xl bg-white dark:bg-[#161820] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.06] text-[11px]">
                        <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">chat</span>
                          #incidents-production • Vigil Bot
                        </span>
                        <span className="text-on-surface-variant text-[10px]">Today at 14:02:26</span>
                      </div>

                      <div>
                        <div className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                          <span>🚨</span>
                          <span>INC-8902: Database Connection Saturation on postgres-primary</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant font-sans mt-1 leading-relaxed">
                          40 downstream alerts collapsed into single causal incident. Root cause: unindexed query in deploy <code className="text-on-surface font-mono">v2.14.0</code>.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-[#f8fafc] dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] text-[10px] text-on-surface-variant flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-primary-container">menu_book</span>
                          <span>ChromaDB Runbook: <strong>postgres-pool-saturation.md</strong></span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">94% Confidence</span>
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#F97316] to-[#D97706] text-white font-semibold text-[11px] shadow-xs hover:brightness-105 active:scale-95 transition-all">
                          Scale PgBouncer (+200)
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#20232c] border border-black/10 dark:border-white/10 text-on-surface font-semibold text-[11px] hover:bg-[#f9fafb] dark:hover:bg-[#282b36] active:scale-95 transition-all">
                          Rollback Deploy v2.14.0
                        </button>
                        <span className="text-[10px] text-on-surface-variant ml-auto">
                          1 click • Human in the loop
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Causal Path */}
                {activeTab === 'graph' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant text-[11px] text-on-surface-variant">
                      <span>Topology Graph Reachability Analysis</span>
                      <span className="text-emerald-500 font-bold">BFS Directed Graph</span>
                    </div>

                    <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#1c1e26] border-2 border-error text-center shadow-md w-36">
                        <div className="text-[9px] uppercase font-bold text-error mb-1 tracking-wider">Root Origin</div>
                        <div className="font-bold text-on-surface text-xs">postgres-primary</div>
                        <div className="text-[10px] text-error font-mono mt-0.5">Pool 100% Saturation</div>
                      </div>

                      <div className="text-on-surface-variant font-bold text-sm hidden sm:block">➔</div>
                      <div className="text-on-surface-variant font-bold text-sm sm:hidden">↓</div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] text-center w-36">
                        <div className="text-[9px] uppercase text-on-surface-variant mb-1">Cascade 1</div>
                        <div className="font-semibold text-on-surface text-xs">auth-service</div>
                        <div className="text-[10px] text-amber-500 mt-0.5">DB Pool Timeout</div>
                      </div>

                      <div className="text-on-surface-variant font-bold text-sm hidden sm:block">➔</div>
                      <div className="text-on-surface-variant font-bold text-sm sm:hidden">↓</div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] text-center w-36">
                        <div className="text-[9px] uppercase text-on-surface-variant mb-1">Downstream</div>
                        <div className="font-semibold text-on-surface text-xs">checkout-api</div>
                        <div className="text-[10px] text-amber-500 mt-0.5">504 Gateway Timeouts</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-on-surface-variant bg-[#fafafa] dark:bg-[#161820] p-3 rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
                      Result: 38 unrelated network alerts on disconnected clusters safely pruned from this incident.
                    </div>
                  </div>
                )}

                {/* Tab 3: Agent Trace DAG */}
                {activeTab === 'dag' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant text-[11px] text-on-surface-variant">
                      <span>LangGraph 6-Node Agentic Pipeline</span>
                      <span className="text-primary-container font-bold">Model: Gemini 3.8 Flash</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-on-surface">1. LOAD</span>
                          <span className="text-emerald-500 font-bold">DONE</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">Telemetry Ingested</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-on-surface">2. CORRELATE</span>
                          <span className="text-emerald-500 font-bold">DONE</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">Path Reachability</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-on-surface">3. INVESTIGATE</span>
                          <span className="text-emerald-500 font-bold">DONE</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">Metric Delta Isolated</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-on-surface">4. RETRIEVAL</span>
                          <span className="text-emerald-500 font-bold">DONE</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">ChromaDB Runbooks</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c1e26] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-on-surface">5. RCA</span>
                          <span className="text-emerald-500 font-bold">DONE</span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">Gemini Synthesis</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-primary-container/10 border border-primary-container/40 flex flex-col gap-1 shadow-xs">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-primary-container">6. REVIEW</span>
                          <span className="text-primary-container font-bold animate-pulse">PENDING</span>
                        </div>
                        <div className="text-[10px] text-on-surface truncate">Human Sign-off</div>
                      </div>
                    </div>

                    <div className="mt-2 p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#161820] border border-black/[0.06] dark:border-white/[0.08] text-[11px] text-on-surface-variant flex items-center justify-between">
                      <span>Audit checkpoint stored in PostgreSQL</span>
                      <span className="font-mono text-primary-container font-bold">Latency: 384ms</span>
                    </div>
                  </div>
                )}

                {/* Tab 4: Slack Dispatch */}
                {activeTab === 'slack' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant text-[11px] text-on-surface-variant">
                      <span>Slack Incoming Webhook Broadcast Preview</span>
                      <span className="text-sky-500">#ops-incidents</span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#1c1e26] border-l-4 border-l-primary-container border-black/[0.06] dark:border-white/[0.08] space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                          <span className="text-base">🚨</span>
                          <span>[OUTAGE] Database Connection Exhaustion (postgres-primary)</span>
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">Vigil Copilot</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        <strong>Root Cause:</strong> Max connection pool limit reached (200/200) causing cascading timeout failures across <strong>auth-service</strong> and <strong>checkout-api</strong>.
                      </p>
                      <div className="text-[10px] text-on-surface-variant bg-[#fafafa] dark:bg-[#161820] p-2 rounded border border-black/[0.06] dark:border-white/[0.08] font-mono">
                        Recommended Action: Runbook matched <code>runbooks/postgres-pool-saturation.md</code>. Run <code>kubectl scale deployment/pgbouncer --replicas=4</code>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]">
                          Approve &amp; Dispatch to Cluster
                        </button>
                        <span className="text-[10px] text-on-surface-variant">Awaiting 1 engineer verification</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
