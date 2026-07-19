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

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 220 && newWidth <= 650) {
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

    return (
        <div
            className={`body-grid flex-1 grid min-h-0 ${
                isDragging ? '' : 'transition-[grid-template-columns] duration-300 ease-in-out'
            } ${activeNode ? 'expanded' : ''}`}
            style={{
                gridTemplateColumns: activeNode ? `300px 1fr ${dagWidth}px` : '300px 1fr 76px',
            }}
        >
            {/* Column 1: Outages list */}
            <IncidentList />

            {/* Column 2: Main details screen */}
            <IncidentDetails />

            {/* Column 3: Agentic trace DAG */}
            <AgentTraceDag onDragStart={handleMouseDown} isResizing={isDragging} />

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
