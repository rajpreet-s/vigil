import { useState } from 'react';
import posthog from 'posthog-js';

type InstallTab = 'docker' | 'helm' | 'alertmanager';

const SNIPPETS: Record<InstallTab, { title: string; filename: string; command: string; notes: string }> = {
  docker: {
    title: 'Docker Compose',
    filename: 'docker-compose.yml',
    command: `# 1. Clone repository
git clone https://github.com/rajpreet-s/vigil.git && cd vigil

# 2. Configure environment (Gemini / Slack / ChromaDB)
cp .env.example .env

# 3. Boot full stack (Web, App, API, LangGraph, ChromaDB)
docker compose up -d`,
    notes: 'Access SRE Dashboard at http://localhost:3000 • Ingestion API at http://localhost:8080',
  },
  helm: {
    title: 'Kubernetes / Helm',
    filename: 'values.yaml',
    command: `# 1. Add Vigil Helm chart repository
helm repo add vigil https://charts.vigil-sre.io
helm repo update

# 2. Deploy into monitoring namespace
helm install vigil vigil/vigil-stack \\
  --namespace monitoring --create-namespace \\
  --set gemini.apiKey=$GEMINI_API_KEY`,
    notes: 'Includes High-Availability API pods, ChromaDB PersistentVolume, and NetworkPolicies.',
  },
  alertmanager: {
    title: 'Alertmanager Webhook',
    filename: 'alertmanager.yml',
    command: `route:
  receiver: 'vigil-incident-engine'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s

receivers:
  - name: 'vigil-incident-engine'
    webhook_configs:
      - url: 'http://vigil-api.monitoring.svc:8080/api/webhooks/alertmanager'
        send_resolved: true`,
    notes: 'Routes raw alerts into Vigil settle timer sliding window. Handles auto-resolution signals.',
  },
};

export default function InstallSection() {
  const [activeTab, setActiveTab] = useState<InstallTab>('docker');
  const [copied, setCopied] = useState(false);

  const current = SNIPPETS[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = current.command;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    posthog.capture('install_command_copied', { tab: activeTab });
  };

  return (
    <section id="install" className="bg-surface-container-lowest py-section-desktop px-4 sm:px-6 border-t border-outline-variant transition-colors duration-300">
      <div className="max-w-max-width mx-auto section-reveal space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-outline-variant rounded-full bg-surface-container/60">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span className="font-mono text-[11px] font-semibold text-primary-container tracking-wider uppercase">
              Production Deployment
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface">
            Up in your VPC in two minutes.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Designed for turnkey deployment in zero-trust environments. 
            Native Docker Compose and Kubernetes Helm charts with zero external telemetry lock-in.
          </p>
        </div>

        {/* Terminal Container in Double-Bezel Frame */}
        <div className="p-2 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md max-w-2xl mx-auto">
          <div className="bg-white dark:bg-[#111318] rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Top Window Bar with Tabs */}
            <div className="bg-[#f9fafb] dark:bg-[#16181f] px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Window Dots */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="ml-2 font-mono text-xs text-on-surface-variant font-medium">
                  {current.filename}
                </span>
              </div>

              {/* Tab Buttons */}
              <div className="flex items-center gap-1 bg-[#f0f1f4] dark:bg-[#0c0e12] p-1 rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
                {(['docker', 'helm', 'alertmanager'] as InstallTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setCopied(false);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {SNIPPETS[tab].title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Window with Tab Blur Transition */}
            <div key={activeTab} className="p-6 relative font-mono text-xs leading-relaxed bg-white dark:bg-[#111318] animate-tab-blur">
              <button
                onClick={handleCopy}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a1d26] hover:bg-[#fafafa] dark:hover:bg-[#222530] border border-black/10 dark:border-white/10 text-on-surface flex items-center gap-1.5 transition-all text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-95"
                title="Copy snippet"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <pre className="text-on-surface overflow-x-auto pr-20">
                <code>{current.command}</code>
              </pre>

              <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary-container">info</span>
                <span>{current.notes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-on-surface-variant font-medium">
          <a
            href="https://github.com/rajpreet-s/vigil"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-base">code</span>
            View GitHub Repository
          </a>
          <span>•</span>
          <a
            href="https://github.com/rajpreet-s/vigil#architecture"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            Documentation &amp; Runbook Spec
          </a>
          <span>•</span>
          <a
            href="https://github.com/rajpreet-s/vigil/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-base">bug_report</span>
            File an Issue
          </a>
        </div>
      </div>
    </section>
  );
}
