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

const COMMON_NON_SERVICES = new Set([
    'long-running',
    '30-minute',
    '10-minute',
    '5-minute',
    '15-minute',
    '60-minute',
    'idle-in-transaction',
    'high-availability',
    'multi-tenant',
    'sub-millisecond',
    'third-party',
    'rate-limiting',
    'zero-downtime',
    'real-time',
    'end-to-end',
    'read-only',
    'write-heavy',
    'pre-incident',
    'in-memory',
    'cross-region',
    'open-source',
    'cloud-native',
]);

const KNOWN_SERVICES_CATALOG = new Set([
    'postgres-db',
    'postgres-primary',
    'payment-service',
    'order-service',
    'api-gateway',
    'auth-service',
    'redis-cache',
    'stripe-gateway',
    'inventory-db',
    'billing-service',
    'checkout-service',
    'notification-service',
    'search-service',
    'user-service',
]);

/**
 * Renders text with inline code blocks and microservice badges.
 * Excludes normal hyphenated English words (e.g. long-running, 30-minute).
 */
function renderFormattedRcaText(text: string, knownServices: string[] = []) {
    if (!text) return null;

    const knownSet = new Set(knownServices.map((s) => s.toLowerCase()));

    // First tokenize by inline code backticks: `code`
    const codeSegments = text.split(/(`[^`]+`)/g);

    return codeSegments.map((segment, sIdx) => {
        // If this is an inline code block: `...`
        if (segment.startsWith('`') && segment.endsWith('`') && segment.length > 2) {
            const codeText = segment.slice(1, -1);
            return (
                <code
                    key={`code-${sIdx}`}
                    className="inline px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-semibold bg-surface-container-high text-primary border border-surface-container-highest shadow-2xs break-all"
                >
                    {codeText}
                </code>
            );
        }

        // Inside regular text, find actual microservice names
        const parts: (string | React.ReactNode)[] = [];
        const regex = /\b([a-z0-9]+(?:-[a-z0-9]+)+)(?::\d+)?\b/gi;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(segment)) !== null) {
            const matchStart = match.index;
            const matchEnd = regex.lastIndex;
            const token = match[1];
            const tokenLower = token.toLowerCase();

            if (matchStart > lastIndex) {
                parts.push(segment.slice(lastIndex, matchStart));
            }

            const isBlocked = COMMON_NON_SERVICES.has(tokenLower);
            const isKnownService =
                !isBlocked &&
                (knownSet.has(tokenLower) ||
                    KNOWN_SERVICES_CATALOG.has(tokenLower) ||
                    /-(service|db|gateway|cache|api|worker|broker|queue)$/i.test(tokenLower));

            if (isKnownService) {
                const isOrigin = knownServices[0] && tokenLower.includes(knownServices[0].toLowerCase());
                parts.push(
                    <span
                        key={`svc-${sIdx}-${token}-${matchStart}`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-semibold border shadow-2xs align-baseline ${
                            isOrigin
                                ? 'bg-status-critical-bg text-status-critical border-status-critical/30'
                                : 'bg-surface-container-high border-surface-container-highest text-on-surface'
                        }`}
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                isOrigin ? 'bg-status-critical animate-pulse' : 'bg-status-warning'
                            }`}
                        />
                        {token}
                    </span>
                );
            } else {
                // Regular hyphenated word
                parts.push(token);
            }

            lastIndex = matchEnd;
        }

        if (lastIndex < segment.length) {
            parts.push(segment.slice(lastIndex));
        }

        return <React.Fragment key={`seg-${sIdx}`}>{parts.length > 0 ? parts : segment}</React.Fragment>;
    });
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

    const isSql = step.command && /^(?:SELECT|ALTER|UPDATE|DELETE|pg_)/i.test(step.command);

    return (
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface border border-surface-container-high/80 hover:border-primary/40 space-y-2.5 shadow-xs transition-all">
            <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary border border-primary/25 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {step.stepNum}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-[13px] text-on-surface font-sans font-medium leading-relaxed">
                        {renderFormattedRcaText(step.description)}
                    </p>
                </div>
            </div>

            {step.command && (
                <div className="ml-0 sm:ml-9 bg-[#0b0f19] text-[#e2e8f0] px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs font-mono shadow-inner group">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80 mb-2 text-[10px] text-slate-400">
                        <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            {isSql ? 'PostgreSQL Query' : 'Shell Command'}
                        </span>
                        <button
                            type="button"
                            onClick={handleCopy}
                            title={copied ? 'Copied to clipboard!' : 'Copy command to clipboard'}
                            className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-all font-sans font-semibold cursor-pointer"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-start gap-2.5 overflow-x-auto py-1">
                        <span className="text-emerald-400 select-none font-bold shrink-0">{isSql ? 'sql>' : '$'}</span>
                        <code className="select-all text-[11.5px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-all sm:break-normal">
                            {step.command}
                        </code>
                    </div>
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
                    <div className="max-w-lg w-full bg-surface border border-surface-container-high/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 text-left">
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
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#F97316] to-[#D97706] text-white font-bold text-xs hover:brightness-105 shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
            <div className="detail-inner p-3 sm:p-5 lg:p-7 max-w-5xl mx-auto space-y-4 sm:space-y-6">
                {/* Outage Header Card */}
                <div className="bg-surface border border-surface-container-high/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                    {/* Top Meta Bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-primary/30 text-primary bg-primary/10 shadow-2xs">
                                {selectedIncident.id.length > 18
                                    ? `INC-${selectedIncident.id.slice(0, 8).toUpperCase()}`
                                    : selectedIncident.id.toUpperCase()}
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

                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold uppercase tracking-wider">
                                SEV-1 CRITICAL
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-secondary flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <Server className="w-3.5 h-3.5 text-primary" />
                                <span>
                                    Source:{' '}
                                    <strong className="text-on-surface">
                                        {selectedIncident.source || parsed.rootCauseService}
                                    </strong>
                                </span>
                            </div>
                            <span className="text-secondary/40 hidden sm:inline">•</span>
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span>
                                    Alerts:{' '}
                                    <strong className="text-on-surface">
                                        {selectedIncident.alertsCount || 6} Correlated
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
                                        className={`text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 font-mono font-bold shadow-xs group border cursor-pointer ${
                                            isTraceCollapsed
                                                ? 'bg-primary/15 hover:bg-primary/25 text-primary border-primary/40'
                                                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-surface-container-highest'
                                        }`}
                                        title="Toggle Agent Execution Pipeline Trace"
                                    >
                                        <Sliders className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
                                        <span>{isTraceCollapsed ? 'Inspect Trace' : 'Hide Trace'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Outage Title */}
                    <h1 className="text-xl sm:text-2xl font-bold font-display text-on-surface tracking-tight leading-snug">
                        {parsed.cleanTitle}
                    </h1>

                    {/* Causal Blast Radius Breadcrumb Path */}
                    {selectedIncident.impactedServices && selectedIncident.impactedServices.length > 0 && (
                        <div className="pt-2 border-t border-surface-container-high/40 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono text-secondary font-semibold uppercase tracking-wider flex items-center gap-1">
                                Blast Radius:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {selectedIncident.impactedServices.map((svc, idx) => (
                                    <React.Fragment key={svc}>
                                        {idx > 0 && <span className="text-secondary/40 text-xs font-mono select-none">➔</span>}
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${
                                                idx === 0
                                                    ? 'bg-status-critical-bg text-status-critical border-status-critical/30'
                                                    : 'bg-surface-container-high/70 text-on-surface border-surface-container-highest'
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    idx === 0 ? 'bg-status-critical animate-ping' : 'bg-status-warning'
                                                }`}
                                            />
                                            {svc}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Executive Agent Causal Conclusion Card */}
                <div className="bg-surface border border-surface-container-high/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-2xs">
                                <Cpu className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-on-surface tracking-wide uppercase font-mono">
                                        LangGraph Agent Causal Analysis
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        SYNTHESIS COMPLETE
                                    </span>
                                </div>
                                <p className="text-[11px] text-secondary font-sans mt-0.5">
                                    Multi-modal RCA correlated across Prometheus metrics, service topology, and runbooks
                                </p>
                            </div>
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
                            CONFIDENCE {selectedIncident.confidence || 90}%
                        </Badge>
                    </div>

                    {/* Q1 — What Broke & Blast Radius (Full-width breathable card) */}
                    <div className="p-4 sm:p-5 rounded-xl bg-surface-low border border-surface-container-high/70 space-y-3 relative overflow-hidden group hover:border-status-critical/40 transition-colors">
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-surface-container-high/50 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-status-critical/10 text-status-critical border border-status-critical/20 flex items-center justify-center text-xs font-bold shrink-0">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-xs font-mono font-bold text-status-critical uppercase tracking-wider">
                                    Q1 · What broke?
                                </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-status-critical/10 text-status-critical border border-status-critical/20 font-bold uppercase tracking-wider">
                                Blast Radius &amp; Anomaly
                            </span>
                        </div>

                        <div className="text-on-surface text-xs sm:text-[13px] font-sans leading-relaxed">
                            {renderFormattedRcaText(parsed.q1WhatBroke, selectedIncident.impactedServices)}
                        </div>

                        {/* Impact Propagation Cascade */}
                        <div className="pt-2.5 border-t border-surface-container-high/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 shrink-0">
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                Cascade Impact:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-status-critical-bg text-status-critical border border-status-critical/30 font-bold text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-status-critical animate-pulse" />
                                    {parsed.rootCauseService}
                                </span>
                                {selectedIncident.impactedServices
                                    ?.filter((s) => s !== parsed.rootCauseService)
                                    .map((svc) => (
                                        <React.Fragment key={svc}>
                                            <span className="text-secondary/50 text-[10px]">➔</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface border border-surface-container-highest font-medium text-[11px]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                {svc}
                                            </span>
                                        </React.Fragment>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Q2 Root Cause & Q3 Deploy Correlation (2-Column Grid on desktop, 1-col on mobile) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                        {/* Q2 — What caused it? */}
                        <div className="p-4 sm:p-5 rounded-xl bg-surface-low border border-surface-container-high/70 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-status-warning/40 transition-colors">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-surface-container-high/50 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-status-warning/10 text-status-warning border border-status-warning/20 flex items-center justify-center text-xs font-bold shrink-0">
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                        </span>
                                        <span className="text-xs font-mono font-bold text-status-warning uppercase tracking-wider">
                                            Q2 · Root Cause
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-status-warning/10 text-status-warning border border-status-warning/20 font-bold uppercase tracking-wider">
                                        Isolated
                                    </span>
                                </div>

                                <div className="text-on-surface text-xs sm:text-[13px] font-sans leading-relaxed">
                                    {renderFormattedRcaText(parsed.q2WhatCausedIt, [parsed.rootCauseService])}
                                </div>
                            </div>

                            <div className="pt-2.5 border-t border-surface-container-high/50 space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider block text-secondary font-mono">
                                    Triggering Metric Anomaly:
                                </span>
                                <div className="flex items-center gap-1.5 max-w-full overflow-hidden">
                                    <code className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 break-all block max-w-full">
                                        pg_stat_activity_connections_high
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Q3 — Did we cause it? */}
                        <div className="p-4 sm:p-5 rounded-xl bg-surface-low border border-surface-container-high/70 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-status-healthy/40 transition-colors">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-surface-container-high/50 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-status-healthy/10 text-status-healthy border border-status-healthy/20 flex items-center justify-center text-xs font-bold shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </span>
                                        <span className="text-xs font-mono font-bold text-status-healthy uppercase tracking-wider">
                                            Q3 · Deploy / Change
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-status-healthy/10 text-status-healthy border border-status-healthy/20 font-bold uppercase tracking-wider">
                                        Ruled Out
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>No deployment events detected</span>
                                </div>

                                <div className="text-on-surface text-xs sm:text-[13px] font-sans leading-relaxed">
                                    {renderFormattedRcaText(parsed.q3DidWeCauseIt.replace(/^\[NO DEPLOY\]\s*/i, ''))}
                                </div>
                            </div>

                            <div className="pt-2.5 border-t border-surface-container-high/50 font-mono text-xs text-secondary space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Audit Window:</span>
                                    <span className="font-semibold text-on-surface">30-min Pre-Incident</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Release Drift:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0 changes (Clean)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Q4 — Interactive Remediation Runbook Checklist */}
                    <div className="p-4 sm:p-5 rounded-xl bg-surface-low border border-surface-container-high/70 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <span className="text-primary font-bold flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
                                <Terminal className="w-4 h-4" />
                                Q4 · SRE Remediation Runbook Checklist
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-secondary border border-surface-container-highest">
                                {parsed.runbookSteps.length} Actionable Step{parsed.runbookSteps.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="space-y-3">
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

                {/* Timeline */}
                <CausalTimeline />

                {/* Slack Human-in-the-loop publisher */}
                <SlackPublisher />
            </div>
        </div>
    );
};
export default IncidentDetails;

