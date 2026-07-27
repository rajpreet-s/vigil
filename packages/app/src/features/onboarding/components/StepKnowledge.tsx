import React, { useState, useEffect } from 'react';
import { Network, BookOpen, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';

interface StepKnowledgeProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

export const StepKnowledge: React.FC<StepKnowledgeProps> = ({ onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState<'topology' | 'runbooks'>('topology');

  // Topology state
  const [upstream, setUpstream] = useState('');
  const [downstream, setDownstream] = useState('');
  const [description, setDescription] = useState('');
  const [edges, setEdges] = useState<Array<{ upstream: string; downstream: string; description: string }>>([]);
  const [isLoadingTopo, setIsLoadingTopo] = useState(false);
  const [isSavingTopo, setIsSavingTopo] = useState(false);
  const [topoMsg, setTopoMsg] = useState<string | null>(null);

  // Runbook state
  const [runbookTitle, setRunbookTitle] = useState('PostgreSQL Connection Pool Mitigation');
  const [runbookService, setRunbookService] = useState('postgresql');
  const [runbookContent, setRunbookContent] = useState(
    `# PostgreSQL Connection Limits\n\nWhen PostgreSQL connection limits are reached:\n1. Check active backend connections: SELECT count(*) FROM pg_stat_activity;\n2. Scale replica pool sizing or adjust max_connections.`
  );
  const [runbookCount, setRunbookCount] = useState(0);
  const [isSavingRb, setIsSavingRb] = useState(false);
  const [rbMsg, setRbMsg] = useState<string | null>(null);

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

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upstream || !downstream) return;

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
        setTopoMsg(`Updated dependency graph! (${data.edges.length} edges active in database)`);
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
    try {
      const res = await fetch('/api/onboarding/topology', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edgeToDelete),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.edges)) {
        setEdges(data.edges);
        setTopoMsg(`Edge removed. (${data.edges.length} edges active in database)`);
      }
    } catch (err) {
      console.error('Failed to delete edge', err);
    }
  };

  const handleSaveRunbook = async () => {
    setIsSavingRb(true);
    setRbMsg(null);
    try {
      const res = await fetch('/api/onboarding/runbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: runbookTitle,
          service_name: runbookService,
          content: runbookContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRunbookCount((prev) => prev + 1);
        setRbMsg(`Runbook "${runbookTitle}" indexed successfully!`);
        setRunbookTitle('');
      } else {
        setRbMsg(data.error || 'Failed to ingest runbook.');
      }
    } catch (err: any) {
      setRbMsg(err.message || 'Error saving runbook.');
    } finally {
      setIsSavingRb(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-mono mb-2">
          <Network className="w-3.5 h-3.5" />
          <span>Causal Topology & ChromaDB Vectors</span>
        </div>
        <h3 className="text-xl font-bold text-white font-display tracking-tight">
          Service Topology & Runbooks
        </h3>
        <p className="text-xs text-secondary/80 mt-0.5">
          Configure causal service dependency directions and feed operational runbooks to ChromaDB vectors.
        </p>
      </div>

      {/* Fluid Pill Tabs */}
      <div className="flex bg-[#0c0e13] p-1 rounded-xl border border-surface-container-high max-w-sm">
        <button
          type="button"
          onClick={() => setActiveTab('topology')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'topology'
              ? 'bg-surface-container-high text-white shadow-sm'
              : 'text-secondary/70 hover:text-white'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Topology ({edges.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('runbooks')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'runbooks'
              ? 'bg-surface-container-high text-white shadow-sm'
              : 'text-secondary/70 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Runbooks ({runbookCount})</span>
        </button>
      </div>

      {activeTab === 'topology' ? (
        <div className="space-y-4">
          <form onSubmit={handleAddEdge} className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Add Dependency Edge</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                placeholder="Upstream (e.g. postgresql)"
                value={upstream}
                onChange={(e) => setUpstream(e.target.value)}
                className="bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              />
              <input
                type="text"
                required
                placeholder="Downstream (e.g. api_service)"
                value={downstream}
                onChange={(e) => setDownstream(e.target.value)}
                className="bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                disabled={isSavingTopo}
                className="px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingTopo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Edge</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="Edge description (e.g. API queries primary Postgres DB)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            />
          </form>

          {/* Configured Edges List from Database */}
          <div className="p-3 rounded-xl bg-[#0c0e13] border border-surface-container-high max-h-48 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-secondary/60 uppercase tracking-wider">
              <span>Database Dependency Graph Rules ({edges.length})</span>
              {isLoadingTopo && <span className="text-primary flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Loading DB...</span>}
            </div>

            {edges.length === 0 && !isLoadingTopo ? (
              <div className="text-center py-4 text-xs text-secondary/60">
                No topology edges configured yet in database. Add your first upstream → downstream pair above.
              </div>
            ) : (
              edges.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-surface-container-low/60 p-2.5 rounded-lg border border-surface-container-high">
                  <div className="font-mono text-xs">
                    <span className="text-primary font-semibold">{e.upstream}</span> <span className="text-secondary/40">➔</span> <span className="text-emerald-400 font-semibold">{e.downstream}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {e.description && <span className="text-[11px] text-secondary/60 truncate max-w-xs">{e.description}</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveEdge(e)}
                      title="Delete edge from database"
                      className="text-secondary/50 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {topoMsg && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {topoMsg}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Ingest Markdown Runbook Document</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Runbook Title"
                value={runbookTitle}
                onChange={(e) => setRunbookTitle(e.target.value)}
                className="bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Service Scope (e.g. postgresql)"
                value={runbookService}
                onChange={(e) => setRunbookService(e.target.value)}
                className="bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <textarea
              rows={4}
              value={runbookContent}
              onChange={(e) => setRunbookContent(e.target.value)}
              className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            {rbMsg && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {rbMsg}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveRunbook}
              disabled={isSavingRb}
              className="ml-auto px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all"
            >
              {isSavingRb ? 'Ingesting...' : 'Ingest into ChromaDB Vector Store'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-xs font-semibold text-secondary border border-surface-container-high transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={() => onNext({ edgesCount: edges.length, runbookCount })}
          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <span>Continue to Readiness Verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
