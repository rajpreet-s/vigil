import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Cpu, ExternalLink, Key, Lock, Eye, EyeOff } from 'lucide-react';

interface StepWorkspaceProps {
  onNext: (data: any) => void;
  status?: any;
  isOwner?: boolean;
}

export const StepWorkspace: React.FC<StepWorkspaceProps> = ({ onNext, status, isOwner = true }) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState<'gemini-3.6-flash' | 'gemini-3.5-flash'>('gemini-3.6-flash');
  const [serverEnvDetected, setServerEnvDetected] = useState(false);
  const [serverKeyPreview, setServerKeyPreview] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const applyStatusData = (data: any) => {
    if (data?.integrations?.gemini?.configured) {
      setServerEnvDetected(true);
      const preview = isOwner ? data.integrations.gemini.keyPreview : null;
      setServerKeyPreview(preview);
      if (isOwner && data.integrations.gemini.apiKey) {
        setGeminiApiKey(data.integrations.gemini.apiKey);
      } else {
        setGeminiApiKey('');
      }
      if (data.integrations.gemini.model === 'gemini-3.5-flash' || data.integrations.gemini.model === 'gemini-3.6-flash') {
        setGeminiModel(data.integrations.gemini.model);
      }
      setValidationResult({
        success: true,
        message: `Gemini AI Engine (${data.integrations.gemini.model || 'gemini-3.6-flash'}) verified from organization settings.`,
      });
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

  const handleValidateKey = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await fetch('/api/onboarding/validate-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: geminiApiKey.trim() || undefined,
          model: geminiModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setValidationResult({
          success: true,
          message: data.message || `Successfully validated ${geminiModel}!`,
          latencyMs: data.latencyMs,
        });
      } else {
        setValidationResult({
          success: false,
          message: data.error || 'Gemini API validation failed. Check your API key and permissions.',
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: any) {
      setValidationResult({
        success: false,
        message: err.message || 'Network error attempting to reach Gemini validation service.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const isVerified = validationResult?.success === true;

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) return;

    onNext({
      geminiApiKey: geminiApiKey.trim() || 'server_env',
      geminiModel,
      verified: true,
    });
  };

  return (
    <form onSubmit={handleProceed} className="space-y-6 animate-fadeIn flex flex-col justify-between min-h-[480px]">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 1 of 4 • AI Reasoning Engine (Required)</span>
          </div>
          <h3 className="text-xl font-bold text-white font-display tracking-tight">
            Connect Google Gemini Engine
          </h3>
          <p className="text-xs text-secondary/80 mt-0.5">
            Vigil uses Google Gemini to correlate anomalous telemetry spikes, inspect causal dependencies, and synthesize incident root causes.
          </p>
        </div>

        {!isOwner && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Read-Only Mode: You are viewing company settings. Only organization Owners can change Gemini API credentials.</span>
          </div>
        )}

        {/* Model Selection Card */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-white/90">
            Select Gemini Reasoning Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => isOwner && setGeminiModel('gemini-3.6-flash')}
              className={`p-4 rounded-xl border text-left transition-all relative ${!isOwner ? 'opacity-80 cursor-default' : ''} ${
                geminiModel === 'gemini-3.6-flash'
                  ? 'bg-primary/10 border-primary shadow-sm shadow-primary/10'
                  : 'bg-[#0c0e13] border-surface-container-high hover:border-surface-container-highest text-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-mono text-white">Gemini 3.6 Flash</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-secondary/80 leading-relaxed">
                Ultra-fast sub-second latency for live alert correlation and immediate incident triage reports.
              </p>
            </button>

            <button
              type="button"
              disabled={!isOwner}
              onClick={() => isOwner && setGeminiModel('gemini-3.5-flash')}
              className={`p-4 rounded-xl border text-left transition-all ${!isOwner ? 'opacity-80 cursor-default' : ''} ${
                geminiModel === 'gemini-3.5-flash'
                  ? 'bg-primary/10 border-primary shadow-sm shadow-primary/10'
                  : 'bg-[#0c0e13] border-surface-container-high hover:border-surface-container-highest text-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-mono text-white">Gemini 3.5 Flash</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Stable
                </span>
              </div>
              <p className="text-[11px] text-secondary/80 leading-relaxed">
                Proven multi-step reasoning for deep causal chain discovery across large microservice fleets.
              </p>
            </button>
          </div>
        </div>

        {/* API Key Input Section */}
        <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-primary" />
              <span>Google AI Studio API Key <span className="text-rose-400">*</span></span>
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <span>Get Free Gemini Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {serverEnvDetected && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {isOwner
                    ? `Cluster environment key detected ${serverKeyPreview ? `(${serverKeyPreview})` : ''}`
                    : 'Gemini AI Engine credentials active (restricted to Owner)'}
                </span>
              </span>
              <span className="text-[10px] font-mono text-secondary/70">
                {isOwner ? 'Owner Access' : 'Protected'}
              </span>
            </div>
          )}

          <div className="space-y-2">
            {!isOwner ? (
              <input
                type="password"
                value=""
                disabled
                readOnly
                placeholder="Configured by Organization Owner (Hidden for security)"
                className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-secondary/60 font-mono opacity-60 cursor-not-allowed select-none"
              />
            ) : (
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                    setValidationResult(null);
                  }}
                  placeholder={
                    serverEnvDetected
                      ? 'Using cluster environment key (or paste a new key to override)'
                      : 'AIzaSy... (Paste Google AI Studio API Key here)'
                  }
                  className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-all"
                />
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 text-secondary/60 hover:text-white transition-colors p-1"
                    title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleValidateKey}
                disabled={!isOwner || isValidating || (!geminiApiKey.trim() && !serverEnvDetected)}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isVerified
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-primary text-on-primary hover:brightness-110 shadow-md shadow-primary/20'
                }`}
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating Gemini Key...</span>
                  </>
                ) : isVerified ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Key Verified & Active (Retest)</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Validate & Test Key</span>
                  </>
                )}
              </button>

              {validationResult?.latencyMs && (
                <span className="text-[11px] font-mono text-secondary/70">
                  Latency: <strong className="text-white">{validationResult.latencyMs}ms</strong>
                </span>
              )}
            </div>
          </div>

          {/* Validation Result Box */}
          {validationResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
                validationResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-status-critical/10 border-status-critical/30 text-rose-300'
              }`}
            >
              {validationResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  {validationResult.success ? 'Engine Authenticated & Ready' : 'Validation Failed'}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">{validationResult.message}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Navigation Footer */}
      <div className="sticky bottom-0 bg-[#111318]/95 backdrop-blur-md pt-4 pb-1 border-t border-surface-container-high/60 z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-secondary/80 flex items-center gap-1.5">
          {!isVerified && !(serverEnvDetected && !isOwner) ? (
            <span className="text-amber-400/90 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {isOwner ? 'Key verification required to unlock next step' : 'Awaiting owner Gemini key configuration'}
            </span>
          ) : (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gemini AI reasoning verified
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!isVerified && !(serverEnvDetected && !isOwner)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Continue to Telemetry Ingestion</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
