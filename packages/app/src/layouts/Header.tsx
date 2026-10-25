import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Settings, Menu, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const {
    connectionState,
    setConnectionState,
    isRefreshing,
    triggerRefresh,
    theme,
    toggleTheme,
    toggleMobileDrawer,
  } = useApp();

  const [showDevMenu, setShowDevMenu] = useState(false);
  const devMenuRef = useRef<HTMLDivElement>(null);

  // Close dev menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (devMenuRef.current && !devMenuRef.current.contains(event.target as Node)) {
        setShowDevMenu(false);
      }
    };
    if (showDevMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDevMenu]);

  // Close dev menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDevMenu) {
        setShowDevMenu(false);
      }
    };
    if (showDevMenu) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDevMenu]);

  const getTitle = () => {
    switch (location.pathname) {
      case '/topology':
        return 'Service Topology';
      case '/runbooks':
        return 'Runbook KB';
      case '/evals':
        return 'Agent Evaluation Suite';
      case '/onboarding':
        return 'Setup & Telemetry';
      case '/incidents':
      default:
        return 'Incidents Monitor';
    }
  };

  return (
    <header className="h-16 border-b border-surface-container-high/40 flex items-center justify-between px-3 sm:px-6 md:px-8 bg-surface-container-low/80 backdrop-blur-md relative z-40 select-none">
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Mobile menu hamburger toggle */}
        <button
          onClick={toggleMobileDrawer}
          className="lg:hidden p-2 -ml-1 text-secondary hover:text-on-surface hover:bg-surface-container-high/40 rounded-lg transition-all"
          aria-label="Toggle navigation menu"
          id="mobile-drawer-toggle"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-xs sm:text-[13px] font-headline-sm font-bold text-on-surface/70 tracking-wider uppercase truncate max-w-[140px] sm:max-w-none">
          {getTitle()}
        </h2>
        
        {/* Connected status badge (quiet & responsive) */}
        <div className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-mono transition-all duration-300 ${
          connectionState === 'connected' ? 'bg-status-healthy/10 text-status-healthy border-status-healthy/20' :
          connectionState === 'reconnecting' ? 'bg-status-warning/10 text-status-warning border-status-warning/20' :
          'bg-status-critical/10 text-status-critical border-status-critical/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            connectionState === 'connected' ? 'bg-status-healthy' :
            connectionState === 'reconnecting' ? 'bg-status-warning animate-pulse' :
            'bg-status-critical'
          }`} />
          <span className="hidden sm:inline">Agent: {connectionState === 'connected' ? 'Connected' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Disconnected'}</span>
          <span className="sm:hidden">{connectionState === 'connected' ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-secondary hover:text-on-surface hover:bg-surface-container-high/50 rounded-lg transition-all"
          title={theme === 'dark' ? 'Switch to Light Mode ("Dawn")' : 'Switch to Dark Mode ("Vigil")'}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-primary hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-amber-700 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Sync metrics button */}
        <button
          onClick={triggerRefresh}
          className="p-2 text-secondary hover:text-on-surface hover:bg-surface-container-high/40 rounded-lg transition-all"
          title="Sync metrics"
          aria-label="Sync metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
        
        <div className="h-4 w-px bg-surface-container-high/60"></div>
        
        {/* Dev settings gear icon */}
        <div className="relative" ref={devMenuRef}>
          <button
            onClick={() => setShowDevMenu((prev) => !prev)}
            className={`p-2 text-secondary hover:text-on-surface hover:bg-surface-container-high/40 rounded-lg transition-all ${
              showDevMenu ? 'text-on-surface bg-surface-container-high/50' : ''
            }`}
            title="Dev Diagnostic Tools"
            aria-label="Dev Diagnostic Tools"
            id="dev-settings-button"
          >
            <Settings className="w-4 h-4" />
          </button>

          {showDevMenu && (
            <div 
              id="dev-settings-menu"
              className="absolute right-0 top-full mt-2 z-50 w-60 bg-surface border border-surface-container-highest rounded-xl p-3.5 shadow-2xl text-[10px] font-mono space-y-2.5 animate-fadeIn"
            >
              <div className="border-b border-surface-container-high pb-2 text-secondary/80 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Dev Diagnostics</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {theme.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-secondary">
                <span>API Local Port:</span>
                <span className="text-on-surface font-semibold font-mono">8080</span>
              </div>
              <div className="flex items-center justify-between text-secondary">
                <span>Theme Mode:</span>
                <span className="text-on-surface font-semibold capitalize">{theme}</span>
              </div>
              <div className="flex items-center justify-between text-secondary pt-1 border-t border-surface-container-high/50">
                <span>SSE Connection:</span>
                <button
                  type="button"
                  onClick={() => setConnectionState(connectionState === 'connected' ? 'disconnected' : 'connected')}
                  className="bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-[9px] font-bold text-on-surface px-2.5 py-1 rounded-md transition-all active:scale-95"
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
