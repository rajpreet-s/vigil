import React from 'react';
import { Database, Layers, Terminal, Search, BookOpen, User } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AccessibleDagTable } from './AccessibleDagTable';
import { NodeAuditLog } from './NodeAuditLog';

interface AgentTraceDagProps {
    onDragStart?: (e: React.MouseEvent) => void;
    isResizing?: boolean;
}

export const AgentTraceDag: React.FC<AgentTraceDagProps> = ({ onDragStart, isResizing }) => {
    const {
        selectedIncident,
        activeNode,
        setActiveNode,
        showAccessibleDAG,
        setShowAccessibleDAG,
        simStep,
    } = useApp();

    if (!selectedIncident) return null;

    const steps = [
        { id: 'load', label: 'load', icon: Database },
        { id: 'correlate', label: 'correlate', icon: Layers },
        { id: 'investigate', label: 'investigate', icon: Terminal },
        { id: 'retrieval', label: 'retrieval', icon: Search },
        { id: 'rca', label: 'rca', icon: BookOpen },
        { id: 'human_review', label: 'human review', icon: User },
    ];

    const getStepStatus = (stepId: string) => {
        if (simStep === 2 && activeNode === stepId) return 'executing';
        if (selectedIncident.status === 'resolved') return 'completed';

        if (selectedIncident.status === 'reviewing') {
            if (stepId === 'human_review') return 'suspended';
            if (stepId === 'notify') return 'idle';
            return 'completed';
        }
        return 'idle';
    };

    return (
        <aside className="dag-col h-full bg-surface-container-lowest/15 transition-all duration-300 border-l border-surface-container-high/40 overflow-hidden flex flex-col relative">
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
            <div className="dag-head flex items-center justify-between border-b border-surface-container-high/40 pb-3 p-4 flex-shrink-0">
                <span className="lbl text-xs tracking-wider font-bold font-headline-sm">
                    AGENT TRACE
                </span>
                <button
                    onClick={() => setShowAccessibleDAG(!showAccessibleDAG)}
                    className="a11y-toggle text-[10px] font-mono bg-surface-container-high px-2 py-1 rounded border border-outline-variant/40 hover:bg-surface-container-highest transition-all"
                >
                    {showAccessibleDAG ? '⛶ Graph view' : '▤ Table view'}
                </button>
            </div>

            {showAccessibleDAG ? (
                <div className="p-4 flex-1 overflow-y-auto">
                    <AccessibleDagTable />
                </div>
            ) : (
                <div
                    className="dag-track flex-1 flex flex-col items-center gap-0 py-4 overflow-y-auto"
                    id="dagTrack"
                >
                    {steps.map((step) => {
                        const status = getStepStatus(step.id);
                        const isCurrentActive = activeNode === step.id;
                        const StepIcon = step.icon;

                        let nodeClass = '';
                        if (status === 'completed') nodeClass = 'done';
                        else if (status === 'suspended') nodeClass = 'active';
                        else if (status === 'executing') nodeClass = 'active';

                        if (isCurrentActive) nodeClass = 'active';

                        return (
                            <button
                                key={step.id}
                                onClick={() => setActiveNode(isCurrentActive ? null : step.id)}
                                className={`dag-node cursor-pointer transition-all duration-200 ${nodeClass}`}
                                data-node={step.id}
                            >
                                <StepIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="node-name-text font-mono tracking-tight ml-1.5">
                                    {step.label}
                                </span>
                                {status === 'suspended' && <span className="star">✳</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Audit Panel - visible only when activeNode is selected and showAccessibleDAG is false */}
            {activeNode && !showAccessibleDAG && (
                <div className="audit-panel show border-t border-surface-container-high/40 flex flex-col p-4 max-h-[52%] overflow-y-auto bg-surface-container-low/20 backdrop-blur-md">
                    <div className="audit-panel-head flex items-center justify-between pb-2 mb-2 border-b border-surface-container-high/20">
                        <span className="name text-xs font-bold text-primary font-mono lowercase">
                            [{activeNode}]
                        </span>
                        <button
                            onClick={() => setActiveNode(null)}
                            className="close-audit text-secondary hover:text-white text-xs px-2 py-0.5 rounded transition-all"
                        >
                            ✕
                        </button>
                    </div>
                    <NodeAuditLog />
                </div>
            )}
        </aside>
    );
};
export default AgentTraceDag;
