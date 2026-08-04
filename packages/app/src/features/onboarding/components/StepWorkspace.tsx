import React, { useState } from 'react';
import { Server, Sparkles, Copy, Check, ArrowRight, ShieldCheck, Building2, Plus, UserPlus, Users } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface StepWorkspaceProps {
  onNext: (data: any) => void;
}

export const StepWorkspace: React.FC<StepWorkspaceProps> = ({ onNext }) => {
  const { activeOrg, userOrgs, createOrg, joinOrg, switchOrg } = useApp();

  const [orgTab, setOrgTab] = useState<'current' | 'create' | 'join'>('current');
  const [newOrgName, setNewOrgName] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);

  const [workspaceName, setWorkspaceName] = useState('Production Cluster');
  const [apiBaseUrl, setApiBaseUrl] = useState(window.location.origin);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const copyToClipboard = async (text: string) => {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return false;
    }
  };

  const handleCopyKey = async () => {
    const keyToCopy = activeOrg?.api_key || '';
    if (!keyToCopy) return;
    const success = await copyToClipboard(keyToCopy);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyInvite = async () => {
    const codeToCopy = activeOrg?.invite_code || activeOrg?.api_key || activeOrg?.slug || '';
    if (!codeToCopy) return;
    const success = await copyToClipboard(codeToCopy);
    if (success) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsSubmittingOrg(true);
    const success = await createOrg(newOrgName.trim());
    setIsSubmittingOrg(false);
    if (success) {
      setNewOrgName('');
      setOrgTab('current');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setIsSubmittingOrg(true);
    const success = await joinOrg(inviteInput.trim());
    setIsSubmittingOrg(false);
    if (success) {
      setInviteInput('');
      setOrgTab('current');
    }
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
      orgId: activeOrg?.id,
      orgKey: activeOrg?.api_key,
    });
  };

  return (
    <form onSubmit={handleProceed} className="space-y-6 animate-fadeIn">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Self-Hosted & Organization Context</span>
        </div>
        <h3 className="text-xl font-bold text-white font-display tracking-tight">
          Organization & Gemini Reasoning Engine
        </h3>
        <p className="text-xs text-secondary/80 mt-0.5">
          Select or set up your organization tenant, then configure your Google Gemini AI engine.
        </p>
      </div>

      {/* Organization Setup Section */}
      <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-high/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/40 pb-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Organization & Tenant Context
            </span>
          </div>

          {/* Org Tabs */}
          <div className="flex items-center gap-1 bg-[#0c0e13] p-1 rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => setOrgTab('current')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                orgTab === 'current' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-secondary/70 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Active Org</span>
            </button>

            <button
              type="button"
              onClick={() => setOrgTab('create')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                orgTab === 'create' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-secondary/70 hover:text-white'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Create New</span>
            </button>

            <button
              type="button"
              onClick={() => setOrgTab('join')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                orgTab === 'join' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-secondary/70 hover:text-white'
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>Join Org</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Current Org Details */}
        {orgTab === 'current' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0c0e13] border border-surface-container-high">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-display">
                    {activeOrg?.name || 'Default Organization'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {activeOrg?.role || 'OWNER'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-secondary/70 mt-0.5">
                  Slug: {activeOrg?.slug || 'default-org'}
                </p>
              </div>

              {userOrgs.length > 1 && (
                <select
                  value={activeOrg?.id || ''}
                  onChange={(e) => switchOrg(e.target.value)}
                  className="bg-surface-container-high border border-surface-container-highest text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  {userOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.role})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Keys Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
                <div className="overflow-hidden pr-2">
                  <div className="text-[11px] font-semibold text-secondary/80">Org API Key</div>
                  <div className="font-mono text-xs text-primary truncate mt-0.5">
                    {activeOrg?.api_key || 'vgl_live_...'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[11px] font-semibold text-white border border-surface-container-highest flex-shrink-0 flex items-center gap-1"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
                <div className="overflow-hidden pr-2">
                  <div className="text-[11px] font-semibold text-secondary/80">Team Invite Code</div>
                  <div className="font-mono text-xs text-emerald-400 truncate mt-0.5">
                    {activeOrg?.invite_code || 'vigil_inv_...'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[11px] font-semibold text-white border border-surface-container-highest flex-shrink-0 flex items-center gap-1"
                >
                  {copiedInvite ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedInvite ? 'Copied' : 'Invite'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Create Org Form */}
        {orgTab === 'create' && (
          <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high space-y-3">
            <h4 className="text-xs font-bold text-white">Create a New Organization</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Acme Corp Infrastructure"
                className="flex-1 bg-surface-container-low border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isSubmittingOrg || !newOrgName.trim()}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg disabled:opacity-50 hover:brightness-110"
              >
                {isSubmittingOrg ? 'Creating...' : 'Create & Switch'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Join Org Form */}
        {orgTab === 'join' && (
          <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high space-y-3">
            <h4 className="text-xs font-bold text-white">Join an Existing Organization</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Paste Invite Code (vigil_inv_...) or Org Slug"
                className="flex-1 bg-surface-container-low border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleJoinSubmit}
                disabled={isSubmittingOrg || !inviteInput.trim()}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg disabled:opacity-50 hover:brightness-110"
              >
                {isSubmittingOrg ? 'Joining...' : 'Join Org'}
              </button>
            </div>
          </div>
        )}
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
