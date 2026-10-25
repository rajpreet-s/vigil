import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Play,
  Terminal,
  Lock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface StepGitHubProps {
  onNext: (data: any) => void;
  onBack: () => void;
  status?: any;
  isOwner?: boolean;
}

export const StepGitHub: React.FC<StepGitHubProps> = ({
  onNext,
  onBack,
  status,
  isOwner = true,
}) => {
  const { activeOrg, showToast } = useApp();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deployCount, setDeployCount] = useState<number>(0);

  // Configuration state
  const [deployWindowMinutes, setDeployWindowMinutes] = useState<number>(30);
  const [isCustomWindow, setIsCustomWindow] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('30');
  const [secret, setSecret] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('main');

  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    message: string;
    deploy?: any;
  } | null>(null);

  // Scoped webhook endpoint containing active org api_key
  const apiKey = activeOrg?.api_key || status?.orgApiKey || '';
  const webhookEndpoint = apiKey
    ? `${window.location.origin}/api/webhook/github?api_key=${apiKey}`
    : `${window.location.origin}/api/webhook/github`;

  useEffect(() => {
    const gh = status?.integrations?.github;
    if (gh) {
      if (typeof gh.deployWindowMinutes === 'number') {
        setDeployWindowMinutes(gh.deployWindowMinutes);
        setCustomMinutesInput(String(gh.deployWindowMinutes));
        if (![15, 30, 45, 60, 90].includes(gh.deployWindowMinutes)) {
          setIsCustomWindow(true);
        }
      }
      if (gh.secret) {
        setSecret(gh.secret);
      }
      if (typeof gh.deployCount === 'number') {
        setDeployCount(gh.deployCount);
      }
      if (gh.targetBranch) {
        setTargetBranch(gh.targetBranch);
      }
    } else {
      if (apiKey && !secret) {
        setSecret(`whsec_${apiKey.slice(0, 16)}`);
      }
    }
  }, [status, apiKey]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret || 'development_secret');
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handlePresetSelect = (minutes: number) => {
    setIsCustomWindow(false);
    setDeployWindowMinutes(minutes);
    setCustomMinutesInput(String(minutes));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomMinutesInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 720) {
      setDeployWindowMinutes(parsed);
    }
  };

  const handleSaveSettings = async () => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/onboarding/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployWindowMinutes,
          secret: secret.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('GitHub deployment settings saved!', 'success');
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error saving settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulateDeploy = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/onboarding/simulate-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'payment-service',
          prTitle: 'fix(checkout): update payment retry backoff threshold',
          author: 'dev-deployer',
          branch: targetBranch || 'main',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulationResult({
          success: true,
          message: data.message || 'Deployment event ingested and registered in Vigil database!',
          deploy: data.deployEvent,
        });
        if (typeof data.totalDeployments === 'number') {
          setDeployCount(data.totalDeployments);
        } else {
          setDeployCount((prev) => prev + 1);
        }
        showToast('Simulated deployment captured!', 'success');
      } else {
        setSimulationResult({
          success: false,
          message: data.error || 'Failed to simulate deployment.',
        });
      }
    } catch (err: any) {
      setSimulationResult({
        success: false,
        message: err.message || 'Network error reaching deployment endpoint.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleContinue = () => {
    onNext({
      githubConfigured: true,
      deployWindowMinutes,
      githubSecret: secret,
      deployCount,
    });
  };

  const presets = [
    { min: 15, label: '15m' },
    { min: 30, label: '30m (Default)' },
    { min: 45, label: '45m' },
    { min: 60, label: '60m' },
    { min: 90, label: '90m' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <GitBranch className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface font-display tracking-tight">
              GitHub Deployments & Causal RCA
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-highest text-secondary border border-surface-container-high font-semibold">
              LangGraph Q3
            </span>
          </div>
          <p className="text-xs text-secondary/80 max-w-2xl leading-relaxed">
            Ingest push events from GitHub repositories. Vigil's Causal Analysis engine tracks code
            releases and checks whether an incident was preceded by a recent deployment.
          </p>
        </div>

        {/* Ingested Deploy Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-surface-container-high/60 border border-surface-container-highest px-3 py-1.5 rounded-xl flex-shrink-0">
          <GitCommit className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-secondary">Deployments:</span>
          <span className="text-xs font-mono font-bold text-on-surface">{deployCount}</span>
          {deployCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </div>
      </div>

      {/* Card 1: Webhook Endpoint & Secret (Full-Width, Stacked) */}
      <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high/60 pb-2.5">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            1. Webhook Endpoint & Authentication
          </span>
          <span className="text-[10px] font-mono text-secondary bg-surface-container-highest px-2 py-0.5 rounded border border-surface-container-high">
            POST /api/webhook/github
          </span>
        </div>

        {/* Grid for URL & Secret side-by-side on md+ screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payload URL Box */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-secondary">
              <span>GitHub Payload URL</span>
              <span className="text-[10px] text-primary font-mono">Scoped to Org API Key</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-highest border border-surface-container-high">
              <input
                type="text"
                readOnly
                value={webhookEndpoint}
                className="w-full min-w-0 bg-transparent text-xs font-mono text-on-surface focus:outline-none select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1.5 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface transition-colors flex-shrink-0"
                title="Copy webhook URL"
              >
                {copiedUrl ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-secondary/70">
              Paste this URL in your GitHub repository's Webhook settings.
            </p>
          </div>

          {/* Webhook Secret Box */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-secondary">
              <span>Webhook Secret (HMAC SHA-256)</span>
              {!isOwner && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Read-only
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-highest border border-surface-container-high">
              <input
                type="text"
                value={secret}
                onChange={(e) => isOwner && setSecret(e.target.value)}
                readOnly={!isOwner}
                placeholder="whsec_..."
                className="w-full min-w-0 bg-transparent text-xs font-mono text-on-surface focus:outline-none select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-1.5 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface transition-colors flex-shrink-0"
                title="Copy webhook secret"
              >
                {copiedSecret ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-secondary/70">
              Set this exact secret in GitHub to cryptographically verify push events.
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Deployment Lookback Window (Full-Width) */}
      <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high/60 pb-2.5">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            2. Deployment Lookback Window
          </span>
          <span className="text-[11px] font-mono text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            Active: {deployWindowMinutes} minutes
          </span>
        </div>

        <p className="text-xs text-secondary/80 leading-relaxed">
          When an anomaly is detected, LangGraph Q3 ("<em>Did we cause it?</em>") checks if a code deployment
          occurred within this time window prior to the incident start.
        </p>

        {/* Presets and Custom Input in a responsive flex layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p) => {
              const isSelected = !isCustomWindow && deployWindowMinutes === p.min;
              return (
                <button
                  key={p.min}
                  type="button"
                  onClick={() => handlePresetSelect(p.min)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-semibold transition-all border whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-highest hover:bg-surface-container-highest/80 text-secondary hover:text-on-surface border-surface-container-high'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Input & Save */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-surface-container-highest border border-surface-container-high rounded-lg px-2.5 py-1">
              <span className="text-xs text-secondary whitespace-nowrap">Custom:</span>
              <input
                type="number"
                min={5}
                max={720}
                value={customMinutesInput}
                onChange={(e) => {
                  setIsCustomWindow(true);
                  handleCustomChange(e);
                }}
                className="w-14 bg-transparent text-xs font-mono text-on-surface text-center focus:outline-none"
              />
              <span className="text-[10px] text-secondary">min</span>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-surface-container-highest transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                {isSaving ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
                <span>Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Verification & Live Test Simulation */}
      <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-on-surface flex flex-wrap items-center gap-2">
              <Play className="w-3.5 h-3.5 text-primary" />
              <span>3. Live Integration Verification</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                1-Click Test
              </span>
            </div>
            <p className="text-xs text-secondary/80 mt-0.5 leading-relaxed">
              Send a synthetic deployment push event to verify database persistence and coordinator correlation.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSimulateDeploy}
            disabled={isSimulating}
            className="px-4 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs flex-shrink-0 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Push...</span>
              </>
            ) : (
              <>
                <GitCommit className="w-3.5 h-3.5" />
                <span>Simulate Test Deployment</span>
              </>
            )}
          </button>
        </div>

        {/* Simulation Feedback Alert */}
        {simulationResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              simulationResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {simulationResult.success ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1 min-w-0 overflow-hidden">
              <div className="font-semibold">{simulationResult.message}</div>
              {simulationResult.deploy && (
                <div className="font-mono text-[11px] opacity-90 truncate">
                  Service: <strong>{simulationResult.deploy.service_name}</strong> • Commit:{' '}
                  <code>{simulationResult.deploy.commit_sha.slice(0, 8)}</code> • PR: "
                  {simulationResult.deploy.pr_title}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card 4: GitHub Setup Instructions Accordion */}
      <div className="rounded-xl border border-surface-container-high bg-surface-container/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-surface-container-high/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-secondary" />
            <span className="text-xs font-bold text-on-surface">
              How to configure in GitHub Repository (5 Steps)
            </span>
          </div>
          {showGuide ? (
            <ChevronUp className="w-4 h-4 text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-secondary" />
          )}
        </button>

        {showGuide && (
          <div className="p-4 pt-1 border-t border-surface-container-high/60 space-y-2.5 text-xs text-secondary/90 leading-relaxed font-sans">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                In your GitHub repository, navigate to <strong>Settings</strong> →{' '}
                <strong>Webhooks</strong> → <strong>Add webhook</strong>.
              </li>
              <li>
                In <strong>Payload URL</strong>, paste your Vigil Webhook URL:{' '}
                <code className="text-primary font-mono text-[11px] px-1 bg-surface-container-highest rounded break-all">
                  {webhookEndpoint}
                </code>
              </li>
              <li>
                In <strong>Content type</strong>, select <strong>application/json</strong>.
              </li>
              <li>
                In <strong>Secret</strong>, paste your secret key:{' '}
                <code className="text-primary font-mono text-[11px] px-1 bg-surface-container-highest rounded">
                  {secret || 'development_secret'}
                </code>
              </li>
              <li>
                Under <strong>Which events would you like to trigger this webhook?</strong>, select{' '}
                <strong>Just the push event</strong>. Click <strong>Add webhook</strong>.
              </li>
            </ol>
            <p className="text-[11px] text-secondary/70 pt-1">
              Vigil automatically ignores ping events and only maps commits that affect services to avoid false alarms.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface text-xs font-semibold transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back: Telemetry</span>
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:brightness-110 text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2"
        >
          <span>Next: Slack Alerts</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepGitHub;
