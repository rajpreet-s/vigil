import React from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toast } from '../components/ui/Toast';

export const DashboardLayout: React.FC = () => {
  const { connectionState, handleReconnect, toast } = useApp();

  return (
    <div className="flex h-screen bg-background text-on-surface font-sans selection:bg-primary-container selection:text-on-primary-container overflow-hidden lantern-bg">
      {/* Specular light reflections & dynamic morphing backdrop glows */}
      <div className="liquid-glass-container">
        <div className="liquid-blob liquid-blob-1"></div>
        <div className="liquid-blob liquid-blob-2"></div>
        <div className="liquid-blob liquid-blob-3"></div>
      </div>
      <div className="glass-specular-sheen"></div>

      {/* Main Toast Notifications */}
      <Toast toast={toast} />

      {/* Disconnection Warning Banner */}
      {connectionState === 'disconnected' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-status-critical/10 backdrop-blur-md border-b border-status-critical/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-status-critical">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>REAL-TIME SSE SYNC INTERRUPTED. SYSTEM RUNNING IN CACHED STATE.</span>
          </div>
          <button 
            onClick={handleReconnect}
            className="bg-status-critical text-on-error font-semibold px-3 py-1 rounded hover:bg-status-critical/80 transition-all"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden z-10">
        <Header />
        
        {/* Page Contents */}
        <div className="flex-1 flex overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
