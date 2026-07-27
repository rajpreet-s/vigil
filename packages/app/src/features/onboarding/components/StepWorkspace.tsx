import React, { useState } from 'react';
import { Server, Sparkles, Copy, Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface StepWorkspaceProps {
  onNext: (data: any) => void;
}

export const StepWorkspace: React.FC<StepWorkspaceProps> = ({ onNext }) => {
  const [workspaceName, setWorkspaceName] = useState('Production Cluster');
  const [apiBaseUrl, setApiBaseUrl] = useState(window.location.origin);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [generatedOrgKey] = useState('vigil_org_live_' + Math.random().toString(36).substring(2, 12));
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedOrgKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      deploymentMode: 'self-hosted',
      workspaceName,
      apiBaseUrl,
      llmProvider: 'gemini',
      geminiModel,
      apiKey: geminiApiKey,
      orgKey: generatedOrgKey,
    });
  };

  return (
    <form onSubmit={handleProceed} className="space-y-6 animate-fadeIn">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Self-Hosted & Telemetry Privacy</span>
        </div>
        <h3 className="text-xl font-bold text-white font-display tracking-tight">
          Environment & Gemini Engine
        </h3>
        <p className="text-xs text-secondary/80 mt-0.5">
          Configure your self-hosted Vigil instance and connect Google Gemini for agentic root-cause analysis.
        </p>
      </div>

      {/* Self-Hosted Architecture Card */}
      <div className="p-4 rounded-xl bg-surface-container-low/60 border border-primary/30 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-xs text-white">
              Self-Hosted Instance (Docker / Kubernetes)
            </div>
            <p className="text-[11px] text-secondary/70">
              Telemetry metrics, incident checkpoints, and ChromaDB runbooks remain isolated inside your cluster.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
          VPC Isolated
        </span>
      </div>

      {/* Workspace Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">Workspace Name</label>
          <input
            type="text"
            required
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all font-sans"
            placeholder="e.g. Production Cluster"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">Vigil API Host URL</label>
          <input
            type="text"
            required
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono transition-all"
            placeholder="http://localhost:3000"
          />
        </div>
      </div>

      {/* Google Gemini Model Picker */}
      <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Reasoning Engine (Google Gemini)
            </span>
          </div>
          <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
            LangGraph Node Engine
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(['gemini-2.5-flash', 'gemini-2.5-pro'] as const).map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => setGeminiModel(model)}
              className={`p-3 rounded-lg border text-left transition-all ${
                geminiModel === model
                  ? 'bg-primary/10 border-primary text-white shadow-sm'
                  : 'bg-[#0c0e13] border-surface-container-high text-secondary hover:text-white'
              }`}
            >
              <div className="text-xs font-bold font-mono">
                {model === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : 'Gemini 2.5 Pro'}
              </div>
              <div className="text-[10px] text-secondary/70 mt-0.5">
                {model === 'gemini-2.5-flash' ? 'Ultra-fast sub-second RCA generation' : 'Deep reasoning for complex cascades'}
              </div>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[11px] text-secondary/80 mb-1">
            Gemini API Key (<span className="font-mono text-white">GEMINI_API_KEY</span>)
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="AIzaSy... (Leave empty to use GEMINI_API_KEY from environment)"
            className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Org Secret Key */}
      <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">Organization API Key</div>
          <div className="font-mono text-xs text-primary mt-0.5 select-all">{generatedOrgKey}</div>
        </div>
        <button
          type="button"
          onClick={handleCopyKey}
          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-white border border-surface-container-highest transition-all flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Next Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <span>Continue to Slack Integration</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
