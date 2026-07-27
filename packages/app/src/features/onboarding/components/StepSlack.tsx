import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, HelpCircle } from 'lucide-react';

interface StepSlackProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

export const StepSlack: React.FC<StepSlackProps> = ({ onNext, onBack }) => {
  const [botToken, setBotToken] = useState('xoxb-11399372408727-11500083551238-h6j6t70bHqjkZ0OWWaPeBDas');
  const [incidentsChannel, setIncidentsChannel] = useState('C0BCAEB9U7N');
  const [oncallUserId, setOncallUserId] = useState('U0BC4NW232A');
  const [signingSecret, setSigningSecret] = useState('79093e2270318866a79eb66b8fc973e8');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; botName?: string; detail?: string } | null>(null);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then((res) => res.json())
      .then((data) => {
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
      const res = await fetch('/api/onboarding/test-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          incidentsChannel,
          oncallUserId,
          signingSecret,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          botName: data.botName,
          message: data.message || `Authenticated with Slack as @${data.botName || 'VigilBot'}! Test alert posted.`,
        });
      } else {
        const errorMsg = data.error || 'Failed to authenticate with Slack API.';
        let detail = '';
        if (errorMsg.includes('invalid_auth')) {
          detail = 'The SLACK_BOT_TOKEN provided is invalid, revoked, or expired. Please check your Slack App at api.slack.com/apps ➔ OAuth & Permissions and copy a valid xoxb- token.';
        } else if (errorMsg.includes('channel_not_found')) {
          detail = `The Channel ID (${incidentsChannel}) was not found or the Bot has not been invited to the channel. Run '/invite @Vigil' inside your Slack channel.`;
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
        message: err.message || 'Network error testing Slack API authentication.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      botToken,
      incidentsChannel,
      oncallUserId,
      signingSecret,
      verified: testResult?.success || false,
    });
  };

  return (
    <form onSubmit={handleProceed} className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-mono mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Incident Broadcasting & Approvals</span>
          </div>
          <h3 className="text-xl font-bold text-white font-display tracking-tight">
            Slack Bot Credentials
          </h3>
          <p className="text-xs text-secondary/80 mt-0.5">
            Vigil posts human-in-the-loop RCA summaries and approval workflows directly to your SRE Slack channel.
          </p>
        </div>

        <a
          href="https://api.slack.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg whitespace-nowrap"
        >
          <span>Manage Slack Apps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Grid of 4 Slack Credentials */}
      <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/90 mb-1">
            Slack Bot OAuth Token (<span className="font-mono text-primary">SLACK_BOT_TOKEN</span>)
          </label>
          <input
            type="password"
            required
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="xoxb-..."
            className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-white/90 mb-1">
              Incidents Channel ID (<span className="font-mono text-primary">SLACK_INCIDENTS_CHANNEL</span>)
            </label>
            <input
              type="text"
              required
              value={incidentsChannel}
              onChange={(e) => setIncidentsChannel(e.target.value)}
              placeholder="e.g. C0BCAEB9U7N"
              className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/90 mb-1">
              On-Call User ID (<span className="font-mono text-primary">SLACK_ONCALL_USER_ID</span>)
            </label>
            <input
              type="text"
              required
              value={oncallUserId}
              onChange={(e) => setOncallUserId(e.target.value)}
              placeholder="e.g. U0BC4NW232A"
              className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/90 mb-1">
            Slack Signing Secret (<span className="font-mono text-primary">SLACK_SIGNING_SECRET</span>)
          </label>
          <input
            type="password"
            required
            value={signingSecret}
            onChange={(e) => setSigningSecret(e.target.value)}
            placeholder="79093e227..."
            className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Verification Card */}
      <div className="p-4 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">Bot OAuth Verification</div>
          <div className="text-[11px] text-secondary/70">Calls <span className="font-mono text-slate-300">slack.auth.test()</span> to verify bot token.</div>
        </div>
        <button
          type="button"
          onClick={handleTestSlack}
          disabled={isTesting}
          className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-primary border border-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isTesting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Verify Slack Bot</span>
            </>
          )}
        </button>
      </div>

      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
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
            <div className="text-[11px] text-slate-300 bg-[#0c0e13]/60 p-2.5 rounded-lg border border-red-500/20 flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span>{testResult.detail}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
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
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <span>Continue to Prometheus Setup</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
