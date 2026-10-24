import React from 'react';
import {
    Database,
    Layers,
    Terminal,
    Search,
    BookOpen,
    User,
    CheckCircle2,
    Clock,
    Activity,
    X,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AccessibleDagTable } from './AccessibleDagTable';
import { NodeAuditLog } from './NodeAuditLog';

interface AgentTraceDagProps {
    onDragStart?: (e: React.MouseEvent) => void;
    isResizing?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    className?: string;
}

export const AgentTraceDag: React.FC<AgentTraceDagProps> = ({
    onDragStart,
    isResizing,
    isCollapsed = false,
    onToggleCollapse,
    className = '',
}) => {
    const {
        selectedIncident,
        activeNode,
        setActiveNode,
        showAccessibleDAG,
        setShowAccessibleDAG,
    } = useApp();

    if (!selectedIncident) return null;

    const steps = [
        { id: 'load', label: 'load', desc: 'Telemetry Ingestion', icon: Database },
        { id: 'correlate', label: 'correlate', desc: 'Topology Graph Isolation', icon: Layers },
        { id: 'investigate', label: 'investigate', desc: 'Prometheus Metric Temporal Alignment', icon: Terminal },
        { id: 'retrieval', label: 'retrieval', desc: 'ChromaDB Vector KB Retrieval', icon: Search },
        { id: 'rca', label: 'rca', desc: 'Gemini LLM Synthesis & Diagnosis', icon: BookOpen },
        { id: 'human_review', label: 'human review', desc: 'Slack Checkpoint & Sign-off', icon: User },
    ];

    const getStepStatus = (stepId: string): 'completed' | 'suspended' | 'executing' | 'idle' => {
        if (selectedIncident.status === 'resolved') return 'completed';

        if (selectedIncident.status === 'reviewing') {
            if (stepId === 'human_review') return 'suspended';
            if (stepId === 'notify') return 'idle';
            return 'completed';
        }
        return 'idle';
    };

    const STEP_DURATIONS: Record<string, string> = {
        load: '18ms',
        correlate: '42ms',
        investigate: '310ms',
        retrieval: '195ms',
        rca: '1.4s',
        human_review: '240ms',
    };

    // Render Collapsed Strip (56px width)
    if (isCollapsed) {
        return (
            <aside className="dag-col h-full w-[56px] bg-surface-container-low/95 backdrop-blur-xl border-l border-surface-container-high/60 flex flex-col items-center justify-between py-3 z-20 select-none">
                {/* Header Expand Button */}
                <button
                    onClick={onToggleCollapse}
                    title="Expand Agent Trace"
                    className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary hover:text-on-surface transition-all border border-surface-container-highest flex items-center justify-center shadow-md"
                >
                    <PanelRightOpen className="w-4 h-4" />
                </button>

                {/* Vertical Stem Line & Centered Icon Strip */}
                <div className="flex-1 w-full flex flex-col items-center justify-center gap-4 relative py-4">
                    <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-px bg-surface-container-high/80 pointer-events-none z-0" />

                    {steps.map((step, idx) => {
                        const status = getStepStatus(step.id);
                        const isCurrentActive = activeNode === step.id;
                        const StepIcon = step.icon;

                        let style = 'bg-white dark:bg-surface-container text-secondary border-black/[0.08] dark:border-white/[0.08]';
                        if (isCurrentActive) {
                            style = 'bg-primary text-on-primary border-primary shadow-md shadow-primary/20';
                        } else if (status === 'completed') {
                            style = 'bg-white dark:bg-surface-container text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
                        } else if (status === 'suspended') {
                            style = 'bg-amber-500/10 text-amber-500 border-amber-500/40 animate-pulse';
                        } else if (status === 'executing') {
                            style = 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30 animate-spin';
                        }

                        return (
                            <button
                                key={step.id}
                                onClick={() => {
                                    if (onToggleCollapse) onToggleCollapse();
                                    setActiveNode(step.id);
                                }}
                                title={`${idx + 1}. ${step.label.toUpperCase()} (${status})`}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all z-10 hover:scale-110 ${style}`}
                            >
                                <StepIcon className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>

                {/* Bottom Status Dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Agent Pipeline Active" />
            </aside>
        );
    }

    return (
        <aside className={`dag-col h-full bg-surface-container-low/90 backdrop-blur-xl border-l border-surface-container-high/60 overflow-hidden flex flex-col relative select-none ${className}`}>
            {/* Resizing Handle on the left border */}
            {activeNode && onDragStart && (
                <div
                    onMouseDown={onDragStart}
                    className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors ${
                        isResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/50'
                    }`}
                    title="Drag to resize panel"
                />
            )}

            {/* Header Banner */}
            <div className="p-3.5 border-b border-surface-container-high/50 flex items-center justify-between flex-shrink-0 bg-surface-container/90">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider font-mono">
                        Agent Trace Pipeline
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowAccessibleDAG(!showAccessibleDAG)}
                        className="text-[10px] font-mono bg-surface-container-high hover:bg-surface-container-highest px-2 py-1 rounded-lg border border-surface-container-highest text-secondary hover:text-on-surface transition-all"
                    >
                        {showAccessibleDAG ? '⛶ Graph' : '▤ Table'}
                    </button>

                    {onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            title="Minimize Agent Trace"
                            className="p-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface transition-all border border-surface-container-highest"
                        >
                            <PanelRightClose className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {showAccessibleDAG ? (
                <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
                    <AccessibleDagTable />
                </div>
            ) : (
                <div className="flex-1 p-4 overflow-y-auto space-y-3 relative scrollbar-thin">
                    {/* Connecting Vertical Stem Line - 1px crisp connector aligned through card icons */}
                    <div className="absolute left-[44px] top-6 bottom-6 w-px bg-surface-container-high/80 dark:bg-white/10 z-0 pointer-events-none" />

                    {steps.map((step, idx) => {
                        const status = getStepStatus(step.id);
                        const isCurrentActive = activeNode === step.id;
                        const StepIcon = step.icon;

                        let borderStyle = 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-surface-container/70 text-on-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-black/20 dark:hover:border-white/20';
                        let iconBoxStyle = 'bg-surface-container-high text-secondary border border-surface-container-highest';
                        let statusBadge = null;

                        if (status === 'completed') {
                            iconBoxStyle = 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                            statusBadge = (
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> OK
                                </span>
                            );
                        } else if (status === 'suspended') {
                            iconBoxStyle = 'bg-amber-500/10 text-amber-500 border border-amber-500/30';
                            statusBadge = (
                                <span className="text-[10px] font-mono text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
                                    <Clock className="w-3 h-3" /> CHECKPOINT
                                </span>
                            );
                        } else if (status === 'executing') {
                            iconBoxStyle = 'bg-amber-500 text-black font-bold';
                            statusBadge = (
                                <span className="text-[10px] font-mono text-amber-500 font-semibold flex items-center gap-1 animate-spin">
                                    <Activity className="w-3 h-3" /> EXECUTING
                                </span>
                            );
                        }

                        // Apply an active tinted border and subtle background highlight ONLY to currently selected step
                        if (isCurrentActive) {
                            borderStyle = 'border-primary ring-1 ring-primary/40 bg-primary/[0.04] dark:bg-primary/[0.08] text-on-surface shadow-sm';
                        }

                        return (
                            <div
                                key={step.id}
                                onClick={() => setActiveNode(isCurrentActive ? null : step.id)}
                                className={`relative z-10 p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${borderStyle}`}
                            >
                                {/* Step Icon Box */}
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${iconBoxStyle}`}>
                                    <StepIcon className="w-4 h-4" />
                                </div>

                                <div className="overflow-hidden flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono text-primary font-bold">0{idx + 1}</span>
                                            <span className="text-xs font-bold font-mono tracking-tight text-on-surface uppercase">
                                                {step.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-secondary/70 dark:text-secondary/60">
                                                {STEP_DURATIONS[step.id] || '32ms'}
                                            </span>
                                            {statusBadge}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-secondary truncate mt-0.5">{step.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Audit Inspector Panel */}
            {activeNode && !showAccessibleDAG && (
                <div className="border-t border-surface-container-high/60 flex flex-col max-h-[52%] overflow-y-auto bg-surface-container/95 backdrop-blur-2xl shadow-2xl p-4 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-surface-container-high/50">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-bold text-primary font-mono lowercase">
                                [{activeNode}] inspector trace
                            </span>
                        </div>
                        <button
                            onClick={() => setActiveNode(null)}
                            className="p-1 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-all"
                            title="Close Inspector"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <NodeAuditLog />
                </div>
            )}
        </aside>
    );
};
export default AgentTraceDag;
