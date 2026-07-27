import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface StepCompleteProps {
  summaryData: any;
  onFinish: () => void;
}

export const StepComplete: React.FC<StepCompleteProps> = ({ summaryData, onFinish }) => {
  const navigate = useNavigate();
  const { triggerSimulatedOutage, showToast } = useApp();
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateAndGo = () => {
    setIsSimulating(true);
    showToast('Onboarding complete! Initiating demonstration alert storm...', 'success');
    onFinish();
    navigate('/incidents');
    setTimeout(() => {
      triggerSimulatedOutage();
    }, 400);
  };

  const handleJustGo = () => {
    showToast('Setup complete! Welcome to Vigil Incident Command.', 'success');
    onFinish();
    navigate('/incidents');
  };

  return (
    <div className="space-y-6 text-center py-4 animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white font-display tracking-tight mb-1">
          Vigil SRE Copilot Ready
        </h3>
        <p className="text-xs text-secondary/80 max-w-sm mx-auto">
          Your telemetry webhooks, Slack Bot credentials, service topology, and runbooks have been configured.
        </p>
      </div>

      {/* Integration Checklist Card */}
      <div className="p-4 rounded-xl bg-[#0c0e13] border border-surface-container-high max-w-md mx-auto text-left space-y-2.5">
        <div className="text-[10px] font-bold text-secondary/60 uppercase tracking-wider mb-1 border-b border-surface-container-high pb-2">
          Workspace Readiness Audit
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Self-Hosted & Gemini Engine</span>
          </span>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            Configured
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Slack App Bot Integration</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Authenticated
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prometheus Webhook Ingestion</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Ready
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Topology Graph & Vector Index</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Indexed
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSimulateAndGo}
          disabled={isSimulating}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Simulate Test Outage & Launch Dashboard</span>
        </button>

        <button
          type="button"
          onClick={handleJustGo}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-xs font-semibold text-secondary border border-surface-container-high transition-all flex items-center justify-center gap-2"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
