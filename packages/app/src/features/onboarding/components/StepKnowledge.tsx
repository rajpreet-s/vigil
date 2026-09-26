import React, { useState, useEffect } from 'react';
import { Network, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw, Layers, Sparkles, Lock } from 'lucide-react';

interface StepKnowledgeProps {
  onNext: (data: any) => void;
  onBack: () => void;
  isOwner?: boolean;
}

export const StepKnowledge: React.FC<StepKnowledgeProps> = ({ onNext, onBack, isOwner = true }) => {
  // Topology state
  const [upstream, setUpstream] = useState('');
  const [downstream, setDownstream] = useState('');
  const [description, setDescription] = useState('');
  const [edges, setEdges] = useState<Array<{ id?: string; upstream: string; downstream: string; description: string }>>([]);
  const [isLoadingTopo, setIsLoadingTopo] = useState(false);
  const [isSavingTopo, setIsSavingTopo] = useState(false);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [topoMsg, setTopoMsg] = useState<string | null>(null);

  // Fetch existing topology edges from PostgreSQL DB on mount
  useEffect(() => {
    setIsLoadingTopo(true);
    fetch('/api/onboarding/topology')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.edges)) {
          setEdges(data.edges);
        }
      })
      .catch((err) => console.error('Failed to fetch existing topology edges:', err))
      .finally(() => setIsLoadingTopo(false));
  }, []);

  const handleApplyPreset = async () => {
    if (!isOwner) return;
    setIsApplyingPreset(true);
    setTopoMsg(null);
    try {
      const res = await fetch('/api/onboarding/apply-preset-topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: 'microservices' }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.edges)) {
        setEdges(data.edges);
        setTopoMsg(`Applied Core Microservices Preset! (${data.edges.length} causal edges loaded)`);
      } else {
        setTopoMsg(data.error || 'Failed to apply preset topology.');
      }
    } catch (err: any) {
      setTopoMsg(err.message || 'Error applying architecture preset.');
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !upstream || !downstream) return;

    setIsSavingTopo(true);
    setTopoMsg(null);
    try {
      const newEdge = { upstream: upstream.trim(), downstream: downstream.trim(), description: description.trim() };
      const res = await fetch('/api/onboarding/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edges: [...edges, newEdge] }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.edges)) {
        setEdges(data.edges);
        setUpstream('');
        setDownstream('');
        setDescription('');
        setTopoMsg(`Added edge: ${newEdge.upstream} ➔ ${newEdge.downstream}`);
      } else {
        setTopoMsg(data.error || 'Failed to save topology edge.');
      }
    } catch (err: any) {
      setTopoMsg(err.message || 'Error updating topology graph.');
    } finally {
      setIsSavingTopo(false);
    }
  };

  const handleRemoveEdge = async (edgeToDelete: { upstream: string; downstream: string }) => {
    if (!isOwner) return;
    try {
      const res = await fetch('/api/onboarding/topology', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edgeToDelete),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.edges)) {
        setEdges(data.edges);
        setTopoMsg(`Edge removed. (${data.edges.length} remaining in graph)`);
      }
    } catch (err) {
      console.error('Failed to delete edge', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono mb-2">
          <Network className="w-3.5 h-3.5" />
          <span>Step 4 of 4 • Causal Service Topology</span>
        </div>
        <h3 className="text-xl font-bold text-white font-display tracking-tight">
          Service Dependency Topology
        </h3>
        <p className="text-xs text-secondary/80 mt-0.5">
          Vigil traverses this causal dependency graph to trace cascading alerts back to the original root cause service.
        </p>
      </div>

      {!isOwner && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Read-Only Mode: You are viewing company topology. Only organization Owners can add, remove, or modify service dependencies.</span>
        </div>
      )}

      {/* 1-Click Architecture Preset Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Standard Microservices Template</span>
              <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">1-Click</span>
            </div>
            <p className="text-[11px] text-secondary/80 mt-0.5 leading-relaxed">
              Auto-populates: <code className="text-white font-mono">api-gateway</code> ➔ <code className="text-white font-mono">auth/order/payment</code> ➔ <code className="text-white font-mono">postgres/redis</code>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApplyPreset}
          disabled={!isOwner || isApplyingPreset}
          className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
        >
          {isApplyingPreset ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Applying Preset...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Microservices Preset</span>
            </>
          )}
        </button>
      </div>

      {/* Manual Custom Edge Form */}
      <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3">
        <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span>Add Custom Service Edge</span>
          <span className="text-[11px] font-mono text-secondary/70">Upstream ➔ Downstream</span>
        </div>

        <form onSubmit={handleAddEdge} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              placeholder={isOwner ? "Upstream (e.g. api-gateway)" : "Configured by Owner"}
              value={upstream}
              disabled={!isOwner}
              onChange={(e) => setUpstream(e.target.value)}
              className={`bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono ${
                !isOwner ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            <input
              type="text"
              placeholder={isOwner ? "Downstream (e.g. order-service)" : "Configured by Owner"}
              value={downstream}
              disabled={!isOwner}
              onChange={(e) => setDownstream(e.target.value)}
              className={`bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono ${
                !isOwner ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={description}
              disabled={!isOwner}
              onChange={(e) => setDescription(e.target.value)}
              className={`bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-sans ${
                !isOwner ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isOwner || isSavingTopo || !upstream || !downstream}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-white text-xs font-semibold border border-surface-container-highest flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>{isSavingTopo ? 'Saving Edge...' : 'Add Dependency Edge'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Edges List */}
      <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-surface-container-high/40">
          <span className="flex items-center gap-2">
            <span>Active Graph Dependencies</span>
            <span className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${edges.length > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
            </span>
          </span>
          {isLoadingTopo && (
            <span className="text-primary flex items-center gap-1 text-[11px] font-mono lowercase">
              <RefreshCw className="w-3 h-3 animate-spin" /> syncing...
            </span>
          )}
        </div>

        {edges.length === 0 && !isLoadingTopo ? (
          <div className="text-center py-5 text-xs text-secondary/70">
            No topology edges configured yet. {isOwner ? 'Click ' : ''}
            {isOwner && <strong className="text-primary">Apply Microservices Preset</strong>}
            {isOwner ? ' above to automatically load 8 core service dependencies.' : 'Awaiting organization Owner configuration.'}
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {edges.map((e, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-surface-container-low/80 hover:bg-surface-container-low p-2 rounded-lg border border-surface-container-high/60 transition-all"
              >
                <div className="flex items-center gap-2 font-mono text-xs overflow-hidden">
                  <span className="text-primary font-semibold truncate">{e.upstream}</span>
                  <span className="text-secondary/50">➔</span>
                  <span className="text-emerald-400 font-semibold truncate">{e.downstream}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {e.description && (
                    <span className="text-[11px] text-secondary/70 truncate max-w-[180px] hidden sm:inline">
                      {e.description}
                    </span>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEdge(e)}
                      title="Delete edge from database"
                      className="text-secondary/50 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {topoMsg && (
        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{topoMsg}</span>
        </div>
      )}

      {/* Sticky Bottom Navigation Footer */}
      <div className="sticky bottom-0 bg-[#111318]/95 backdrop-blur-md pt-4 pb-1 border-t border-surface-container-high/60 z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-xs font-semibold text-secondary border border-surface-container-high transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {edges.length === 0 && (
            <span className="text-xs text-amber-400/90 font-medium hidden sm:inline">
              At least 1 topology edge is required to proceed
            </span>
          )}
          <button
            type="button"
            disabled={edges.length === 0}
            onClick={() => onNext({ edgesCount: edges.length })}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Continue to Final Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
