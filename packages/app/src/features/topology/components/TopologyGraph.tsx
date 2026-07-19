import React from 'react';
import { Database, Server } from 'lucide-react';

export const TopologyGraph: React.FC = () => {
  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      <div className="border-b border-surface-container-high/40 pb-4">
        <h3 className="text-xl font-bold font-display text-white mb-2">Service Topology Graph Model</h3>
        <p className="text-sm text-secondary leading-relaxed">
          Dependency graph propagation mapping. Causal path algorithms scan these paths to trace suspected root causes down network limits.
        </p>
      </div>

      <div className="bg-surface-container-high/10 border border-surface-container-high/60 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 max-w-2xl w-full">
          {/* Database Node */}
          <div className="flex flex-col items-center p-6 bg-surface-container-high/80 border border-surface-container-highest rounded-xl text-center shadow-lg w-40 relative group hover:border-primary/50 transition-all">
            <Database className="w-8 h-8 text-primary mb-3" />
            <span className="text-sm font-bold text-white">Postgres DB</span>
            <span className="text-[10px] font-mono text-status-healthy mt-1 uppercase">[🟢 HEALTHY]</span>
          </div>

          <div className="hidden md:block text-secondary font-bold text-lg font-mono transition-all group-hover:text-white">←</div>

          {/* API Service Node */}
          <div className="flex flex-col items-center p-6 bg-surface-container-high/80 border-2 border-primary rounded-xl text-center shadow-lg w-44 relative animate-pulse">
            <div className="absolute -top-2 px-2 py-0.5 bg-primary text-on-primary text-[10px] rounded font-bold font-mono uppercase tracking-wider">
              Target Fault
            </div>
            <Server className="w-8 h-8 text-primary mb-3" />
            <span className="text-sm font-bold text-white">API Service</span>
            <span className="text-[10px] font-mono text-status-warning mt-1 uppercase">[🟡 DEGRADED]</span>
          </div>

          <div className="hidden md:block text-secondary font-bold text-lg font-mono">←</div>

          {/* Frontend Gateway Node */}
          <div className="flex flex-col items-center p-6 bg-surface-container-high/80 border border-surface-container-highest rounded-xl text-center shadow-lg w-40 relative group hover:border-primary/50 transition-all">
            <Server className="w-8 h-8 text-blue-400 mb-3" />
            <span className="text-sm font-bold text-white">Gateway</span>
            <span className="text-[10px] font-mono text-status-healthy mt-1 uppercase">[🟢 HEALTHY]</span>
          </div>
        </div>

        <div className="mt-12 text-xs font-mono text-secondary bg-surface-container-high/30 p-4 border border-surface-container-high/60 rounded-lg max-w-md text-center leading-relaxed">
          Causal Inference Protocol: <strong>Temporal Alert Grouping & Causal Path Reachability Analysis</strong>
        </div>
      </div>
    </div>
  );
};
export default TopologyGraph;
