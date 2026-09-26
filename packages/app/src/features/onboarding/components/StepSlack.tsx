import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, SkipForward, Link2, Lock } from 'lucide-react';

interface StepSlackProps {
  onNext: (data: any) => void;
  onBack: () => void;
  status?: any;
  isOwner?: boolean;
}

export const StepSlack: React.FC<StepSlackProps> = ({ onNext, onBack, status, isOwner = true }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [serverSlackDetected, setServerSlackDetected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; detail?: string } | null>(null);

  const applyStatusData = (data: any) => {
    if (data?.integrations?.slack?.configured) {
      setServerSlackDetected(true);
      if (data.integrations.slack.webhookUrl) {
        setWebhookUrl(data.integrations.slack.webhookUrl);
      }
    }
  };

  useEffect(() => {
    if (status) {
      applyStatusData(status);
    } else {
      fetch('/api/onboarding/status')
        .then((res) => res.json())
        .then((data) => applyStatusData(data))
        .catch(() => {});
    }
  }, [status]);

  const handleTestSlack = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/onboarding/test-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Connected to Slack webhook successfully. Test alert sent.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test message to Slack webhook.',
          detail: 'Verify the webhook URL starts with https://hooks.slack.com/services/... and is active.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error testing Slack webhook.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = testResult?.success || serverSlackDetected;

  const handleProceed = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onNext({
      webhookUrl: webhookUrl.trim(),
      verified: isConfigured,
      skipped: false,
    });
  };

  const handleSkip = () => {
    onNext({
      skipped: true,
      verified: false,
    });
  };

  return (
    <form onSubmit={handleProceed} className="space-y-5 animate-fadeIn flex flex-col justify-between min-h-[480px]">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-mono mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Step 3 of 4 - Incident Broadcasting (Optional)</span>
            </div>
            <h3 className="text-xl font-bold text-white font-display tracking-tight">
              Slack Incoming Webhook
            </h3>
            <p className="text-xs text-secondary/80 mt-0.5">
              Connect a Slack Incoming Webhook to broadcast instant RCA triage reports to your engineering team.
            </p>
          </div>

          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg whitespace-nowrap hidden sm:flex"
          >
            <span>Slack Webhook Guide</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {!isOwner && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Read-Only Mode: You are viewing company settings. Only organization Owners can change Slack Incoming Webhook settings.</span>
          </div>
        )}

        {serverSlackDetected && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Slack Webhook URL configured in company settings</span>
            </span>
            <span className="text-[10px] font-mono text-secondary/70">Ready</span>
          </div>
        )}

        {/* Webhook URL Input */}
        <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-white/90">
              Slack Incoming Webhook URL
            </label>
            <span className="text-[11px] text-secondary/70 font-mono">
              https://hooks.slack.com/services/...
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={webhookUrl}
              disabled={!isOwner}
              onChange={(e) => {
                if (isOwner) {
                  setWebhookUrl(e.target.value);
                  setTestResult(null);
                }
              }}
              placeholder={
                !isOwner
                  ? 'Configured by Organization Owner'
                  : 'https://hooks.slack.com/services/T000.../B000.../XXXXX'
              }
              className={`w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all ${
                !isOwner ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>
          <p className="text-[11px] text-secondary/70">
            Paste the incoming webhook URL for your designated alerts channel. No bot tokens or OAuth scopes needed.
          </p>
        </div>

        {/* Verification Test Card */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">Connection Verification</div>
            <div className="text-[11px] text-secondary/70">
              Sends a test alert message to your Slack webhook URL.
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSlack}
            disabled={!isOwner || isTesting || (!webhookUrl.trim() && !serverSlackDetected)}
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-primary border border-primary/30 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                <span>Test Webhook</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.detail && (
              <div className="text-[11px] text-slate-300 bg-[#0c0e13]/60 p-2 rounded border border-red-500/20">
                {testResult.detail}
              </div>
            )}
          </div>
        )}
      </div>

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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleSkip}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-secondary hover:text-white border border-surface-container-highest transition-all flex items-center justify-center gap-1.5"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip Slack for Now</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Continue to Service Topology</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};
