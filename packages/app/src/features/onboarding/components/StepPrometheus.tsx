import React, { useState } from 'react';
import { Flame, Copy, Check, RefreshCw, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StepPrometheusProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

export const StepPrometheus: React.FC<StepPrometheusProps> = ({ onNext, onBack }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dynamic webhook endpoint matching current host/origin
  const webhookEndpoint = `${window.location.origin}/api/webhook/alertmanager`;

  const alertmanagerYaml = `global:
  resolve_timeout: 1m

route:
  receiver: 'vigil-webhook'
  group_by: ['alertname', 'severity', 'service']
  group_wait: 10s
  group_interval: 30s
  repeat_interval: 5m

  routes:
    # Critical alerts get immediate priority grouping
    - match:
        severity: critical
      receiver: 'vigil-webhook'
      group_wait: 5s
      group_interval: 20s
      repeat_interval: 2m

receivers:
  - name: 'vigil-webhook'
    webhook_configs:
      - url: '${webhookEndpoint}'
        send_resolved: true`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(alertmanagerYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const handleTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/onboarding/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Synthetic Prometheus anomaly processed through settle-timer pipeline!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to trigger synthetic webhook.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error reaching webhook endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-mono mb-2">
          <Flame className="w-3.5 h-3.5" />
          <span>Telemetry & Webhook Ingestion</span>
        </div>
        <h3 className="text-xl font-bold text-white font-display tracking-tight">
          Prometheus & Alertmanager Webhooks
        </h3>
        <p className="text-xs text-secondary/80 mt-0.5">
          Configure Alertmanager to stream firing alerts directly into Vigil's debouncing settle-timer pipeline.
        </p>
      </div>

      {/* Webhook URL Card */}
      <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-white">
          <span>Webhook Receiver Endpoint</span>
          <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            HTTP POST Receiver
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookEndpoint}
            className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2 text-xs font-mono text-primary focus:outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopyUrl}
            className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-white rounded-lg border border-surface-container-highest transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>
      </div>

      {/* Copyable Alertmanager YAML */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-white/90">
          <span>Add to your <code className="text-primary font-mono">alertmanager.yml</code>:</span>
          <button
            type="button"
            onClick={handleCopyYaml}
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5"
          >
            {copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedYaml ? 'YAML Copied!' : 'Copy YAML Snippet'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="bg-[#0c0e13] border border-surface-container-high rounded-xl p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-56">
            {alertmanagerYaml}
          </pre>
        </div>
      </div>

      {/* Test Webhook Action */}
      <div className="p-4 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">Synthetic Anomaly Ingestion</div>
          <div className="text-[11px] text-secondary/70">Sends a test firing alert to verify webhook receipt.</div>
        </div>
        <button
          type="button"
          onClick={handleTestWebhook}
          disabled={isTesting}
          className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-primary border border-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isTesting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Ingesting...</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5" />
              <span>Trigger Test Alert</span>
            </>
          )}
        </button>
      </div>

      {testResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Navigation */}
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
          type="button"
          onClick={() => onNext({ verified: testResult?.success || false })}
          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <span>Continue to Topology & Runbooks</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
