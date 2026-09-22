import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, HelpCircle, SkipForward, ChevronDown, ChevronUp, Link2, Bot } from 'lucide-react';

interface StepSlackProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

export const StepSlack: React.FC<StepSlackProps> = ({ onNext, onBack }) => {
  const [integrationMode, setIntegrationMode] = useState<'webhook' | 'bot'>('webhook');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [incidentsChannel, setIncidentsChannel] = useState('');
  const [oncallUserId, setOncallUserId] = useState('');
  const [signingSecret, setSigningSecret] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serverSlackDetected, setServerSlackDetected] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; botName?: string; detail?: string } | null>(null);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.integrations?.slack?.configured) {
          setServerSlackDetected(true);
          setIntegrationMode('bot');
        }
        if (data.integrations?.slack?.env) {
          const s = data.integrations.slack.env;
          if (s.botToken && !s.botToken.includes('...')) setBotToken(s.botToken);
          if (s.incidentsChannel) setIncidentsChannel(s.incidentsChannel);
          if (s.oncallUserId) setOncallUserId(s.oncallUserId);
          if (s.signingSecret && s.signingSecret !== 'configured') setSigningSecret(s.signingSecret);
        }
      })
      .catch(() => {});
  }, []);

  const handleTestSlack = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const payload: any = {};
      if (integrationMode === 'webhook') {
        payload.webhookUrl = webhookUrl.trim();
      } else {
        payload.botToken = botToken.trim() || undefined;
        payload.incidentsChannel = incidentsChannel.trim() || undefined;
        payload.oncallUserId = oncallUserId.trim() || undefined;
        payload.signingSecret = signingSecret.trim() || undefined;
      }

      const res = await fetch('/api/onboarding/test-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          botName: data.botName,
          message: data.message || `Connected to Slack successfully! Test alert sent.`,
        });
      } else {
        const errorMsg = data.error || 'Failed to authenticate with Slack.';
        let detail = '';
        if (errorMsg.includes('invalid_auth')) {
          detail = 'The SLACK_BOT_TOKEN provided is invalid, revoked, or expired. Copy a valid xoxb- token from api.slack.com/apps.';
        } else if (errorMsg.includes('channel_not_found')) {
          detail = `The Channel (${incidentsChannel}) was not found or the Bot has not been invited. Run '/invite @Vigil' inside your Slack channel.`;
        }

        setTestResult({
          success: false,
          message: errorMsg,
          detail,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error testing Slack integration.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = testResult?.success || serverSlackDetected;

  const handleProceed = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onNext({
      integrationMode,
      webhookUrl: webhookUrl.trim(),
      botToken: botToken.trim(),
      incidentsChannel: incidentsChannel.trim(),
      oncallUserId: oncallUserId.trim(),
      signingSecret: signingSecret.trim(),
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
              <span>Step 3 of 4 • Incident Broadcasting (Optional)</span>
            </div>
            <h3 className="text-xl font-bold text-white font-display tracking-tight">
              Slack Notifications & Alerts
            </h3>
            <p className="text-xs text-secondary/80 mt-0.5">
              Connect Slack to broadcast instant RCA triage reports to your engineering team when an incident strikes.
            </p>
          </div>

          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg whitespace-nowrap hidden sm:flex"
          >
            <span>Slack Apps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tab Switcher: Webhook (Simple) vs Bot Token */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0c0e13] border border-surface-container-high rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIntegrationMode('webhook');
              setTestResult(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              integrationMode === 'webhook'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-secondary hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Webhook URL (Easiest)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIntegrationMode('bot');
              setTestResult(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              integrationMode === 'bot'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-secondary hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot Token (Full App)</span>
          </button>
        </div>

        {serverSlackDetected && !botToken && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cluster secret detected (SLACK_BOT_TOKEN already mounted)</span>
            </span>
            <span className="text-[10px] font-mono text-secondary/70">Ready to test</span>
          </div>
        )}

        {/* Mode 1: Webhook URL (Single Field) */}
        {integrationMode === 'webhook' && (
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white/90">
                Slack Incoming Webhook URL
              </label>
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <span>How to get a Webhook URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://hooks.slack.com/services/T000.../B000.../XXXXX"
              className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
            />
            <p className="text-[11px] text-secondary/70">
              Paste the webhook URL generated from Slack's "Incoming Webhooks" app directory. Takes 30 seconds and requires no OAuth tokens.
            </p>
          </div>
        )}

        {/* Mode 2: Bot Token + Channel */}
        {integrationMode === 'bot' && (
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Slack Bot Token (<span className="font-mono text-primary">xoxb-...</span>)
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => {
                    setBotToken(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="xoxb-..."
                  className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Incidents Channel (<span className="font-mono text-primary">#incidents or ID</span>)
                </label>
                <input
                  type="text"
                  value={incidentsChannel}
                  onChange={(e) => setIncidentsChannel(e.target.value)}
                  placeholder="e.g. #incidents or C01234567"
                  className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Optional Collapsible Advanced Settings */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-secondary/70 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Advanced Settings (Interactive Button Approvals & On-Call User)</span>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-surface-container-high/40">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Signing Secret (Optional)
                    </label>
                    <input
                      type="password"
                      value={signingSecret}
                      onChange={(e) => setSigningSecret(e.target.value)}
                      placeholder="SLACK_SIGNING_SECRET"
                      className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      On-Call User ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={oncallUserId}
                      onChange={(e) => setOncallUserId(e.target.value)}
                      placeholder="e.g. U0123456789"
                      className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Test Card */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">Connection Verification</div>
            <div className="text-[11px] text-secondary/70">
              {integrationMode === 'webhook' ? 'Sends a test ping to your webhook channel.' : 'Verifies bot authentication & channel post permissions.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSlack}
            disabled={isTesting || (integrationMode === 'webhook' ? !webhookUrl.trim() : !botToken && !serverSlackDetected)}
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-primary border border-primary/30 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Test Slack Connection</span>
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
              <div className="text-[11px] text-slate-300 bg-[#0c0e13]/60 p-2 rounded border border-red-500/20 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{testResult.detail}</span>
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
