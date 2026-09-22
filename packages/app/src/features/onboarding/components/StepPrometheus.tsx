import React, { useState } from 'react';
import { Flame, Copy, Check, RefreshCw, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Code } from 'lucide-react';

interface StepPrometheusProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

export const StepPrometheus: React.FC<StepPrometheusProps> = ({ onNext, onBack }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [showYaml, setShowYaml] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [alertConfigured, setAlertConfigured] = useState(false);
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
      const res = await fetch('/api/onboarding/simulate-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'payment-service',
          alertname: 'High5xxRate',
          severity: 'critical',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Synthetic Prometheus anomaly processed and registered in Vigil database!',
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

  const isReady = testResult?.success === true || alertConfigured;

  return (
    <div className="space-y-6 animate-fadeIn flex flex-col justify-between min-h-[480px]">
      <div className="space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-mono mb-2">
            <Flame className="w-3.5 h-3.5" />
            <span>Step 2 of 4 • Telemetry & Ingestion (Required)</span>
          </div>
          <h3 className="text-xl font-bold text-white font-display tracking-tight">
            Prometheus & Alertmanager Webhook
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

        {/* Test Webhook Action (Primary Step Gating) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-surface-container-low/60 to-surface-container-low/60 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Verify Pipeline Ingestion</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">1-Click Test</span>
            </div>
            <div className="text-[11px] text-secondary/80 mt-0.5">
              Simulates a live Prometheus 5xx anomaly into PostgreSQL to verify receiver and correlation.
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={isTesting}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 flex-shrink-0 ${
              testResult?.success
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-orange-500 text-white hover:brightness-110 shadow-md shadow-orange-500/20'
            }`}
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : testResult?.success ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ingestion Verified (Retest)</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5" />
                <span>Simulate Test Alert</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
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

        {/* Collapsible Alertmanager YAML snippet */}
        <div className="border border-surface-container-high rounded-xl overflow-hidden bg-[#0c0e13]">
          <button
            type="button"
            onClick={() => setShowYaml(!showYaml)}
            className="w-full p-3 flex items-center justify-between text-xs font-semibold text-secondary hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-primary" />
              <span>View Prometheus <code className="text-primary font-mono">alertmanager.yml</code> Configuration Snippet</span>
            </span>
            {showYaml ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showYaml && (
            <div className="p-3 border-t border-surface-container-high bg-black/40 space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyYaml}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5"
                >
                  {copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedYaml ? 'YAML Copied!' : 'Copy YAML'}</span>
                </button>
              </div>
              <pre className="bg-[#0c0e13] border border-surface-container-high rounded-lg p-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-48">
                {alertmanagerYaml}
              </pre>
            </div>
          )}
        </div>

        {/* Alternative Checkbox acknowledgement */}
        <label className="flex items-center gap-2.5 text-xs text-secondary/90 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={alertConfigured}
            onChange={(e) => setAlertConfigured(e.target.checked)}
            className="rounded border-surface-container-highest bg-[#0c0e13] text-primary focus:ring-primary w-4 h-4"
          />
          <span>I have configured Alertmanager in my cluster or verified the webhook endpoint.</span>
        </label>
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

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {!isReady && (
            <span className="text-xs text-amber-400/90 font-medium hidden sm:inline">
              Simulate an alert or check acknowledgement to proceed
            </span>
          )}
          <button
            type="button"
            disabled={!isReady}
            onClick={() => onNext({ verified: true })}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Continue to Slack Integration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
