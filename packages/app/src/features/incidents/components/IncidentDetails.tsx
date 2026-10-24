import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity,
    Server,
    AlertTriangle,
    Cpu,
    ShieldAlert,
    Sliders,
    CheckCircle2,
    HelpCircle,
    Zap,
    Terminal,
    Copy,
    Check,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Badge } from '../../../components/ui/Badge';
import { CausalTimeline } from './CausalTimeline';
import { SlackPublisher } from './SlackPublisher';
import { parseRcaSummary, type RunbookStep } from '../utils/formatIncident';

interface IncidentDetailsProps {
    isTraceCollapsed?: boolean;
    onToggleTrace?: () => void;
}

/**
 * Renders text with structured monospace service badges for microservice names.
 */
function renderTextWithServiceBadges(text: string, knownServices: string[] = []) {
    if (!text) return null;
    const parts: (string | React.ReactNode)[] = [];
    const knownSet = new Set(knownServices.map((s) => s.toLowerCase()));
    const regex = /\b([a-z0-9]+(?:-[a-z0-9]+)+)(?::\d+)?\b/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = regex.lastIndex;
        const serviceName = match[1];

        if (matchStart > lastIndex) {
            parts.push(text.slice(lastIndex, matchStart));
        }

        const isKnown = knownSet.size === 0 || knownSet.has(serviceName.toLowerCase()) || knownServices.some((k) => serviceName.toLowerCase().includes(k.toLowerCase()));

        parts.push(
            <span
                key={`${serviceName}-${matchStart}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-surface-container-high border border-surface-container-highest text-on-surface shadow-xs mx-0.5 align-baseline"
            >
                <span className={`w-1.5 h-1.5 rounded-full ${isKnown ? 'bg-status-critical' : 'bg-status-warning'}`} />
                {serviceName}
            </span>
        );

        lastIndex = matchEnd;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

/**
 * Interactive checklist item for Q4 Runbook with 1-click copy terminal bar.
 */
function RunbookStepItem({ step }: { step: RunbookStep }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!step.command) return;
        navigator.clipboard.writeText(step.command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-3 rounded-xl bg-surface border border-surface-container-high/70 space-y-2 shadow-xs transition-all hover:border-surface-container-highest">
            <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step.stepNum}
                </span>
                <p className="text-xs text-on-surface font-sans font-medium leading-relaxed">
                    {step.description}
                </p>
            </div>

            {step.command && (
                <div className="ml-7 flex items-center justify-between gap-3 bg-[#0c0e14] text-[#e2e8f0] px-3 py-2 rounded-lg border border-black/20 text-xs font-mono shadow-inner">
                    <div className="flex items-center gap-2 truncate">
                        <span className="text-emerald-400 select-none font-bold">$</span>
                        <span className="truncate select-all text-[11px]">{step.command}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        title={copied ? 'Copied to clipboard!' : 'Copy command'}
                        className="flex items-center gap-1 text-[10px] text-secondary hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-all shrink-0 font-sans"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export const IncidentDetails: React.FC<IncidentDetailsProps> = ({
    isTraceCollapsed,
    onToggleTrace,
}) => {
    const { selectedIncident, incidents, triggerRefresh, showToast } = useApp();
    const [isSimulating, setIsSimulating] = useState(false);

    const handleSimulateTestOutage = async () => {
        setIsSimulating(true);
        try {
            const res = await fetch('/api/onboarding/simulate-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: 'postgres-primary',
                    alertname: 'PostgresConnectionExhaustion',
                    severity: 'critical',
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Simulated alert storm injected! Correlating causal graph...', 'success');
                setTimeout(() => {
                    triggerRefresh();
                }, 1000);
            } else {
                showToast(data.error || 'Failed to simulate alert', 'error');
            }
        } catch {
            showToast('Network error while simulating alert', 'error');
        } finally {
            setIsSimulating(false);
        }
    };

    if (!selectedIncident) {
        if (incidents.length === 0) {
            return (
                <div className="detail-col flex-1 overflow-y-auto min-h-0 bg-surface/60 backdrop-blur-md border-r border-surface-container-high/40 p-4 sm:p-8 flex flex-col items-center justify-center text-center">
                    <div className="max-w-lg w-full bg-surface border border-surface-container-high/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 text-left">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                                    All Systems Operational
                                </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                                0 Outages
                            </span>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold font-display text-on-surface">
                                No Active Incidents Detected
                            </h2>
                            <p className="text-xs text-secondary mt-1.5 leading-relaxed font-sans">
                                Vigil is continuously listening for Prometheus Alertmanager alerts and monitoring service topology dependencies. When an alert storm triggers, root-cause synthesis and live investigation DAGs will automatically populate here.
                            </p>
                        </div>

                        {/* Telemetry Status Cards */}
                        <div className="space-y-2 pt-1 font-mono text-[11px]">
                            <div className="p-3 rounded-xl bg-surface-low border border-surface-container-high/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Server className="w-4 h-4 text-primary" />
                                    <span className="text-on-surface font-semibold">Webhook Receiver</span>
                                </div>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active (/api/webhook/alerts)
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-surface-low border border-surface-container-high/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-primary" />
                                    <span className="text-on-surface font-semibold">Gemini AI Synthesis</span>
                                </div>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">Ready</span>
                            </div>
                        </div>

                        {/* Interactive simulation action */}
                        <div className="pt-2 border-t border-surface-container-high/40 flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={handleSimulateTestOutage}
                                disabled={isSimulating}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#F97316] to-[#D97706] text-white font-bold text-xs hover:brightness-105 shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                <span>{isSimulating ? 'Injecting Simulated Alert...' : 'Simulate Test Alert Storm'}</span>
                            </button>
                            <Link
                                to="/setup"
                                className="px-4 py-2.5 rounded-xl bg-surface-low hover:bg-surface-container-high text-xs font-semibold text-secondary hover:text-on-surface border border-surface-container-high transition-all flex items-center justify-center gap-1.5"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Setup &amp; Telemetry</span>
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary min-h-[400px] p-6 text-center">
                <Activity className="w-12 h-12 mb-3 text-primary/40 animate-pulse" />
                <h3 className="text-sm font-semibold text-on-surface">No Incident Selected</h3>
                <p className="text-xs text-secondary mt-1 max-w-sm font-sans">
                    Select an active outage from the list on the left to inspect root-cause analysis, blast radius, and agent trace DAG.
                </p>
            </div>
        );
    }

    const parsed = parseRcaSummary(
        selectedIncident.suspectedRootCause || selectedIncident.title,
        selectedIncident.impactedServices,
        selectedIncident.id,
        selectedIncident.fix_steps || []
    );

    return (
        <div className="detail-col flex-1 overflow-y-auto min-h-0 bg-surface/60 backdrop-blur-md border-r border-surface-container-high/40">
            <div className="detail-inner p-3 sm:p-6 lg:p-7 max-w-4xl space-y-4 sm:space-y-6">
                {/* Outage Header Card */}
                <div className="bg-surface-container/90 border border-surface-container-high/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-primary/30 text-primary bg-primary/10 font-bold">
                                {selectedIncident.id.length > 18
                                    ? `inc-${selectedIncident.id.slice(0, 10)}`
                                    : selectedIncident.id}
                            </span>
                            <Badge
                                variant={
                                    selectedIncident.status === 'reviewing'
                                        ? 'critical'
                                        : selectedIncident.status === 'resolved'
                                          ? 'healthy'
                                          : 'secondary'
                                }
                                category="status"
                                animate={selectedIncident.status === 'reviewing'}
                            >
                                {selectedIncident.status === 'reviewing'
                                    ? 'REVIEWING'
                                    : selectedIncident.status === 'resolved'
                                      ? 'RESOLVED'
                                      : 'DISMISSED'}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-secondary">
                            <div className="flex items-center gap-1.5">
                                <Server className="w-3.5 h-3.5 text-primary" />
                                <span>
                                    Source:{' '}
                                    <strong className="text-on-surface">
                                        {selectedIncident.source || parsed.rootCauseService}
                                    </strong>
                                </span>
                            </div>
                            <span className="text-secondary/40">•</span>
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span>
                                    Alerts:{' '}
                                    <strong className="text-on-surface">
                                        {selectedIncident.alertsCount}
                                    </strong>
                                </span>
                            </div>

                            {/* Desktop Trace Toggle Button */}
                            {onToggleTrace && (
                                <div className="hidden lg:flex items-center gap-2">
                                    <span className="text-secondary/40">•</span>
                                    <button
                                        type="button"
                                        onClick={onToggleTrace}
                                        className={`text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 font-mono font-bold shadow-md group border ${
                                            isTraceCollapsed
                                                ? 'bg-primary/15 hover:bg-primary/25 text-primary border-primary/40'
                                                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-surface-container-highest'
                                        }`}
                                        title="Toggle Agent Execution Pipeline Trace"
                                    >
                                        <Sliders className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
                                        <span>
                                            {isTraceCollapsed
                                                ? 'Inspect Trace'
                                                : 'Hide Trace'}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold font-display text-on-surface tracking-tight leading-snug">
                        {parsed.cleanTitle}
                    </h2>
                </div>

                {/* Executive Agent Causal Conclusion Card — Double-Bezel Bento Q1-Q3 + Interactive Q4 */}
                <div className="p-2 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.02] border border-black/[0.07] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_-6px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)]">
                    <div className="bg-surface rounded-[18px] border border-black/[0.05] dark:border-white/[0.06] p-4 sm:p-5 space-y-4">
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-3 border-b border-surface-container-high/50 pb-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-on-surface tracking-wide uppercase font-mono">
                                <Cpu className="w-4 h-4 text-primary" />
                                <span>LangGraph Agent Causal Analysis</span>
                            </div>
                            <Badge
                                variant={
                                    selectedIncident.confidence >= 80
                                        ? 'healthy'
                                        : selectedIncident.confidence >= 60
                                          ? 'warning'
                                          : 'critical'
                                }
                                category="confidence"
                            >
                                CONFIDENCE {selectedIncident.confidence}%
                            </Badge>
                        </div>

                        {/* Bento Grid: Q1, Q2, Q3 (3-Column compact scan row) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Q1 — What broke? */}
                            <div className="p-3.5 rounded-xl bg-surface-low border border-surface-container-high/60 flex flex-col justify-between space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-primary">
                                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        Q1 · What broke?
                                    </span>
                                </div>
                                <div className="text-on-surface text-xs font-sans leading-relaxed flex-1">
                                    {renderTextWithServiceBadges(parsed.q1WhatBroke, selectedIncident.impactedServices)}
                                </div>
                            </div>

                            {/* Q2 — What caused it? */}
                            <div className="p-3.5 rounded-xl bg-surface-low border border-surface-container-high/60 flex flex-col justify-between space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-500">
                                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        Q2 · Root Cause
                                    </span>
                                </div>
                                <div className="text-on-surface text-xs font-sans leading-relaxed flex-1">
                                    {renderTextWithServiceBadges(parsed.q2WhatCausedIt, [parsed.rootCauseService])}
                                </div>
                            </div>

                            {/* Q3 — Did we cause it? */}
                            <div className="p-3.5 rounded-xl bg-surface-low border border-surface-container-high/60 flex flex-col justify-between space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-500">
                                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Q3 · Deploy / Change
                                    </span>
                                </div>
                                <div className="text-on-surface text-xs font-sans leading-relaxed flex-1">
                                    {renderTextWithServiceBadges(parsed.q3DidWeCauseIt)}
                                </div>
                            </div>
                        </div>

                        {/* Q4 — Interactive Remediation Runbook Checklist */}
                        <div className="p-4 rounded-xl bg-surface-low border border-surface-container-high/60 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-primary font-bold flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider">
                                    <Terminal className="w-4 h-4" />
                                    Q4 · Remediation Runbook Checklist
                                </span>
                                <span className="text-[10px] font-mono text-secondary">
                                    {parsed.runbookSteps.length} Step{parsed.runbookSteps.length === 1 ? '' : 's'}
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {parsed.runbookSteps.length > 0 ? (
                                    parsed.runbookSteps.map((step) => (
                                        <RunbookStepItem key={step.stepNum} step={step} />
                                    ))
                                ) : (
                                    <p className="text-xs text-secondary italic">No remediation steps available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <CausalTimeline />

                {/* Slack Human-in-the-loop publisher */}
                <SlackPublisher />
            </div>
        </div>
    );
};
export default IncidentDetails;
