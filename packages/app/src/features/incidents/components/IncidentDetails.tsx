import React from 'react';
import {
    Activity,
    Server,
    AlertTriangle,
    Cpu,
    ShieldAlert,
    Sliders,
    CheckCircle2,
    HelpCircle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Badge } from '../../../components/ui/Badge';
import { CausalTimeline } from './CausalTimeline';
import { SlackPublisher } from './SlackPublisher';
import { parseRcaSummary } from '../utils/formatIncident';

interface IncidentDetailsProps {
    isTraceCollapsed?: boolean;
    onToggleTrace?: () => void;
}

export const IncidentDetails: React.FC<IncidentDetailsProps> = ({
    isTraceCollapsed,
    onToggleTrace,
}) => {
    const { selectedIncident } = useApp();

    if (!selectedIncident) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary min-h-[400px]">
                <Activity className="w-12 h-12 mb-3 text-surface-container-highest animate-pulse" />
                <p className="text-sm font-medium">
                    Select or trigger an incident outage to audit workflow
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

                {/* Executive Agent Causal Conclusion Card — Official 4-Question Framework */}
                <div className="bg-surface-container/90 border border-surface-container-high/60 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-2xl space-y-4 sm:space-y-5">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full filter blur-3xl pointer-events-none" />

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

                    {/* 4-Question Structured Framework Cards */}
                    <div className="space-y-3 font-mono text-xs">
                        {/* Q1 */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 space-y-1">
                            <span className="text-primary font-bold flex items-center gap-1.5 text-[11px]">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Q1 — What broke?
                            </span>
                            <p className="text-on-surface text-xs font-sans leading-relaxed pl-5">
                                {parsed.q1WhatBroke}
                            </p>
                        </div>

                        {/* Q2 */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 space-y-1">
                            <span className="text-amber-500 font-bold flex items-center gap-1.5 text-[11px]">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Q2 — What caused it?
                            </span>
                            <p className="text-on-surface text-xs font-sans leading-relaxed pl-5">
                                {parsed.q2WhatCausedIt}
                            </p>
                        </div>

                        {/* Q3 */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 space-y-1">
                            <span className="text-emerald-500 font-bold flex items-center gap-1.5 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Q3 — Did we cause it?
                            </span>
                            <p className="text-on-surface text-xs font-sans leading-relaxed pl-5">
                                {parsed.q3DidWeCauseIt}
                            </p>
                        </div>

                        {/* Q4 */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 space-y-1">
                            <span className="text-cyan-500 font-bold flex items-center gap-1.5 text-[11px]">
                                <Activity className="w-3.5 h-3.5" />
                                Q4 — What do I do?
                            </span>
                            <div className="text-on-surface text-xs font-mono leading-relaxed pl-5 whitespace-pre-wrap">
                                {parsed.q4WhatToDo}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-container-high/40">
                        <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">
                            Impacted Services:
                        </span>
                        {selectedIncident.impactedServices.map((svc) => (
                            <span
                                key={svc}
                                className="text-[11px] font-mono bg-surface-container-high text-on-surface font-semibold border border-surface-container-highest px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-status-critical" />
                                {svc}
                            </span>
                        ))}
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
