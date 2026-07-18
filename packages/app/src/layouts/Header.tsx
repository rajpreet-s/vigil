import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, RefreshCw, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const {
    connectionState,
    setConnectionState,
    isSimulating,
    isRefreshing,
    triggerRefresh,
    triggerSimulatedOutage
  } = useApp();

  const [showDevMenu, setShowDevMenu] = useState(false);

  const getTitle = () => {
    switch (location.pathname) {
      case '/topology':
        return 'Service Topology';
      case '/runbooks':
        return 'Runbook KB';
      case '/evals':
        return 'Agent Evaluation Suite';
      case '/incidents':
      default:
        return 'Incidents Monitor';
    }
  };

  return (
    <header className="h-16 border-b border-surface-container-high/40 flex items-center justify-between px-8 bg-surface-container-low/20 backdrop-blur-md relative">
      <div className="flex items-center gap-4">
        <h2 className="text-[13px] font-headline-sm font-bold text-white/50 tracking-wider uppercase">{getTitle()}</h2>
        
        {/* Connected status badge (quiet) */}
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono transition-all duration-300 ${
          connectionState === 'connected' ? 'bg-status-healthy/5 text-status-healthy/90 border-status-healthy/20' :
          connectionState === 'reconnecting' ? 'bg-status-warning/5 text-status-warning/90 border-status-warning/20' :
          'bg-status-critical/5 text-status-critical/90 border-status-critical/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            connectionState === 'connected' ? 'bg-status-healthy' :
            connectionState === 'reconnecting' ? 'bg-status-warning animate-pulse' :
            'bg-status-critical'
          }`} />
          <span>Agent: {connectionState === 'connected' ? 'Connected' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Simulated outage trigger button (saturated CTA) */}
        <button
          onClick={triggerSimulatedOutage}
          disabled={isSimulating}
          className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold flex items-center gap-2 transition-all ${
            isSimulating 
              ? 'bg-surface-container-high border-surface-container-highest text-secondary/60 cursor-not-allowed'
              : 'bg-primary border-primary text-on-primary hover:brightness-110 shadow-md animate-pulse'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isSimulating ? 'Simulating...' : 'Trigger Simulated Outage'}
        </button>

        <button
          onClick={triggerRefresh}
          className="p-2 text-secondary hover:text-white hover:bg-surface-container-high/40 rounded-lg transition-all"
          title="Sync metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
        
        <div className="h-4 w-px bg-surface-container-high/40"></div>
        
        {/* dev settings gear icon to hold dev diagnostic tools */}
        <div className="relative">
          <button
            onClick={() => setShowDevMenu(!showDevMenu)}
            className={`p-2 text-secondary hover:text-white hover:bg-surface-container-high/40 rounded-lg transition-all ${showDevMenu ? 'text-white bg-surface-container-high/40' : ''}`}
            title="Dev Diagnostic Tools"
          >
            <Settings className="w-4 h-4" />
          </button>

          {showDevMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 bg-surface-container border border-surface-container-high rounded-lg p-3 shadow-xl text-[10px] font-mono space-y-2.5">
              <div className="border-b border-surface-container-high pb-1.5 text-secondary/70 font-bold uppercase tracking-wider">
                Dev Diagnostics
              </div>
              <div className="flex items-center justify-between text-secondary">
                <span>API Local Port:</span>
                <span className="text-white">8080</span>
              </div>
              <div className="flex items-center justify-between text-secondary">
                <span>SSE Connection:</span>
                <button
                  onClick={() => setConnectionState(connectionState === 'connected' ? 'disconnected' : 'connected')}
                  className="bg-surface-container-high border border-outline-variant/35 text-[9px] font-bold text-white px-2 py-0.5 rounded hover:bg-surface-container-highest transition-all"
                >
                  {connectionState === 'connected' ? 'Drop Sync' : 'Restore Sync'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
