import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { IncidentList } from './IncidentList';
import { IncidentDetails } from './IncidentDetails';
import { AgentTraceDag } from './AgentTraceDag';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const IncidentsMonitor: React.FC = () => {
    const { activeNode, showDismissModal, setShowDismissModal, handleConfirmDismiss } = useApp();
    const [dagWidth, setDagWidth] = useState<number>(340);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Responsive screen width detection
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
            const small = window.innerWidth < 1280;
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
