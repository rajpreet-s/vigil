import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileText, GitCommit } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { IncidentList } from './IncidentList';
import { IncidentDetails } from './IncidentDetails';
import { AgentTraceDag } from './AgentTraceDag';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

type MobileTab = 'alerts' | 'timeline' | 'trace';

export const IncidentsMonitor: React.FC = () => {
    const {
        activeNode,
        showDismissModal,
        setShowDismissModal,
        handleConfirmDismiss,
        incidents,
        selectedIncident,
    } = useApp();

    const [dagWidth, setDagWidth] = useState<number>(340);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');

    // Responsive screen width detection
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1024;
        }
        return false;
    });

    const [isSmallScreen, setIsSmallScreen] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1280;
        }
        return false;
    });

    // Default to hidden trace (collapsed) on smaller screens (< 1280px)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1280;
        }
        return false;
    });

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 1024;
            const small = width < 1280;
            setIsMobile(mobile);
            setIsSmallScreen(small);
            if (small && !isCollapsed) {
                setIsCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isCollapsed]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 260 && newWidth <= 650) {
                setDagWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const isTraceOpen = !isCollapsed;
    const isListMini = isSmallScreen && isTraceOpen;

    const listWidth = isListMini ? 56 : 300;
    const traceWidth = isCollapsed ? (isSmallScreen ? 0 : 56) : activeNode ? Math.max(dagWidth, 320) : dagWidth;

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
            {/* Mobile / Tablet View (< 1024px) */}
            {isMobile ? (
                <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-surface">
                    {/* Mobile 3-Panel Segmented Navigation Bar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-surface-container-high/60 bg-surface-container-low/95 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container border border-surface-container-high/50 w-full">
                            <button
                                type="button"
                                onClick={() => setMobileTab('alerts')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all ${
                                    mobileTab === 'alerts'
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'text-secondary hover:text-on-surface'
                                }`}
                            >
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                <span>Alerts</span>
                                {incidents.length > 0 && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                            mobileTab === 'alerts'
                                                ? 'bg-on-primary/20 text-on-primary'
                                                : 'bg-surface-container-highest text-secondary'
                                        }`}
                                    >
                                        {incidents.length}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setMobileTab('timeline')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all ${
                                    mobileTab === 'timeline'
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'text-secondary hover:text-on-surface'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span>Timeline</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMobileTab('trace')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all ${
                                    mobileTab === 'trace'
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'text-secondary hover:text-on-surface'
                                }`}
                            >
                                <GitCommit className="w-3.5 h-3.5 shrink-0" />
                                <span>Agent Trace</span>
                                {activeNode && (
                                    <span className="w-2 h-2 rounded-full bg-status-active animate-pulse shrink-0" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Content Area */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {mobileTab === 'alerts' && (
                            <IncidentList
                                className="w-full flex-1 border-r-0"
                                onSelectIncident={() => setMobileTab('timeline')}
                            />
                        )}

                        {mobileTab === 'timeline' && (
                            <IncidentDetails
                                isTraceCollapsed={true}
                                onToggleTrace={() => setMobileTab('trace')}
                            />
                        )}

                        {mobileTab === 'trace' && (
                            selectedIncident ? (
                                <AgentTraceDag
                                    isCollapsed={false}
                                    className="w-full flex-1 border-l-0"
                                    onToggleCollapse={() => setMobileTab('timeline')}
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-secondary">
                                    <ShieldAlert className="w-12 h-12 text-primary/40 mb-3" />
                                    <p className="text-sm font-medium text-on-surface">No incident selected</p>
                                    <p className="text-xs text-secondary mt-1">Select an incident from the Alerts tab to inspect agent traces.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            ) : (
                /* Desktop 3-Column Split View (>= 1024px) */
                <div
                    className={`body-grid flex-1 grid min-h-0 ${
                        isDragging ? '' : 'transition-[grid-template-columns] duration-300 ease-in-out'
                    }`}
                    style={{
                        gridTemplateColumns: `${listWidth}px 1fr ${traceWidth}px`,
                    }}
                >
                    {/* Column 1: Outages list (supports 56px mini strip mode on smaller screens when trace is open) */}
                    <IncidentList
                        isMini={isListMini}
                        onExpandList={() => setIsCollapsed(true)}
                    />

                    {/* Column 2: Main details screen */}
                    <IncidentDetails
                        isTraceCollapsed={isCollapsed}
                        onToggleTrace={() => setIsCollapsed((prev) => !prev)}
                    />

                    {/* Column 3: Agentic trace DAG */}
                    {!(isSmallScreen && isCollapsed) && (
                        <AgentTraceDag
                            onDragStart={handleMouseDown}
                            isResizing={isDragging}
                            isCollapsed={isCollapsed}
                            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
                        />
                    )}
                </div>
            )}

            {/* Confirmation Modal for destructive Incident Dismiss */}
            <Modal
                isOpen={showDismissModal}
                onClose={() => setShowDismissModal(false)}
                title="Confirm Outage Dismissal"
            >
                <p className="mb-6 text-sm text-secondary leading-relaxed">
                    Are you sure you want to dismiss this incident? This action cannot be undone,
                    and the checkpointed state logs in PostgreSQL will be discarded.
                </p>
                <div className="flex items-center justify-end gap-3">
                    <Button onClick={() => setShowDismissModal(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleConfirmDismiss}>
                        Yes, Dismiss Outage
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default IncidentsMonitor;
