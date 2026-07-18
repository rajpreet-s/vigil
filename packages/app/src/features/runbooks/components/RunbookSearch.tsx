import React from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const RunbookSearch: React.FC = () => {
  const {
    kbQuery,
    setKbQuery,
    kbResults,
    isSearchingKb,
    handleKbSearch,
  } = useApp();

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 max-w-5xl">
      <div className="border-b border-surface-container-high/40 pb-4">
        <h3 className="text-xl font-bold font-display text-white mb-2">ChromaDB Runbook Knowledge Base</h3>
        <p className="text-sm text-secondary">
          Search vectorized system runbooks matching active incident context keys to feed LLM analysis prompts.
        </p>
      </div>

      {/* Semantic search box */}
      <div className="bg-surface-container-low/40 border border-surface-container-high/60 rounded-xl p-6">
        <form onSubmit={handleKbSearch} className="space-y-4">
          <label htmlFor="kb-query" className="text-xs font-bold text-white uppercase tracking-wider block">ChromaDB Semantic Query Playground</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-secondary" />
              <input
                id="kb-query"
                type="text"
                placeholder="Search corpus (e.g. 'connection pool', 'replica lag', 'garbage collector')..."
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline focus:outline-2 focus:outline-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingKb}
              className="bg-primary hover:brightness-110 text-on-primary font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow"
            >
              {isSearchingKb ? 'Searching...' : 'Vector Search'}
            </button>
          </div>
        </form>

        {/* Similarity metrics results output */}
        {kbResults.length > 0 && (
          <div className="mt-6 space-y-3 animate-fadeIn">
            <span className="text-[10px] text-secondary font-mono uppercase block">Semantic Similarity Matches</span>
            <div className="space-y-3">
              {kbResults.map((res, i) => (
                <div key={i} className="bg-surface-container-lowest/60 border border-surface-container-high p-4 rounded-lg flex flex-col md:flex-row justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-primary font-bold">{res.file}</span>
                    <p className="text-xs text-white mt-1 leading-relaxed">{res.doc}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] bg-status-healthy/10 text-status-healthy border border-status-healthy/25 px-2 py-0.5 rounded font-mono font-bold">
                      Distance Score: {res.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default RunbookSearch;
