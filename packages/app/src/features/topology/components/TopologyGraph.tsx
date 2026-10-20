import React from 'react';
import { Database, Server, ArrowDown, ArrowLeft } from 'lucide-react';

export const TopologyGraph: React.FC = () => {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      <div className="border-b border-surface-container-high/40 pb-4">
        <h3 className="text-xl font-bold font-display text-on-surface mb-2">Service Topology Graph Model</h3>
        <p className="text-sm text-secondary leading-relaxed">
          Dependency graph propagation mapping. Causal path algorithms scan these paths to trace suspected root causes down network limits.
        </p>
      </div>

      <div className="bg-surface-container-low border border-surface-container-high/60 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[400px]">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 max-w-2xl w-full">
          {/* Database Node */}
          <div className="flex flex-col items-center p-5 sm:p-6 bg-surface-container border border-surface-container-high/60 rounded-xl text-center shadow-md w-full max-w-[200px] md:w-40 relative group hover:border-primary/50 transition-all">
            <Database className="w-8 h-8 text-primary mb-3" />
            <span className="text-sm font-bold text-on-surface">Postgres DB</span>
            <span className="text-[10px] font-mono text-status-healthy mt-1 uppercase">[🟢 HEALTHY]</span>
          </div>

          {/* Desktop Arrow */}
          <div className="hidden md:flex text-secondary font-bold text-lg items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </div>
          {/* Mobile Arrow */}
          <div className="md:hidden flex text-secondary items-center justify-center">
            <ArrowDown className="w-5 h-5 text-secondary" />
          </div>

          {/* API Service Node */}
          <div className="flex flex-col items-center p-5 sm:p-6 bg-surface-container border-2 border-primary rounded-xl text-center shadow-lg w-full max-w-[220px] md:w-44 relative animate-pulse">
            <div className="absolute -top-2.5 px-2 py-0.5 bg-primary text-on-primary text-[10px] rounded font-bold font-mono uppercase tracking-wider shadow-sm">
              Target Fault
            </div>
            <Server className="w-8 h-8 text-primary mb-3" />
            <span className="text-sm font-bold text-on-surface">API Service</span>
            <span className="text-[10px] font-mono text-status-warning mt-1 uppercase">[🟡 DEGRADED]</span>
          </div>

          {/* Desktop Arrow */}
          <div className="hidden md:flex text-secondary font-bold text-lg items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </div>
          {/* Mobile Arrow */}
          <div className="md:hidden flex text-secondary items-center justify-center">
            <ArrowDown className="w-5 h-5 text-secondary" />
          </div>

          {/* Frontend Gateway Node */}
          <div className="flex flex-col items-center p-5 sm:p-6 bg-surface-container border border-surface-container-high/60 rounded-xl text-center shadow-md w-full max-w-[200px] md:w-40 relative group hover:border-primary/50 transition-all">
            <Server className="w-8 h-8 text-blue-500 mb-3" />
            <span className="text-sm font-bold text-on-surface">Gateway</span>
            <span className="text-[10px] font-mono text-status-healthy mt-1 uppercase">[🟢 HEALTHY]</span>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 text-xs font-mono text-secondary bg-surface-container p-4 border border-surface-container-high/60 rounded-lg max-w-md text-center leading-relaxed">
          Causal Inference Protocol: <strong className="text-on-surface">Temporal Alert Grouping & Causal Path Reachability Analysis</strong>
        </div>
      </div>
    </div>
  );
};

export default TopologyGraph;
