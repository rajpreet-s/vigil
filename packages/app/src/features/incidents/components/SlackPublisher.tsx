import React from 'react';
import { MessageSquare, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';

export const SlackPublisher: React.FC = () => {
    const {
        selectedIncident,
        draftRcaReport,
        setDraftRcaReport,
        setShowDismissModal,
        handleApproveSlack,
    } = useApp();

    if (!selectedIncident) return null;

    // Render Resolved Confirmation Panel
    if (selectedIncident.status === 'resolved') {
        return (
            <div className="bg-[#34d399]/5 border border-[#34d399]/30 rounded-xl p-5 relative space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#34d399]">
                    <CheckCircle className="w-5 h-5" />
                    <span>INCIDENT RESOLVED & SLACK BROADCAST DISPATCHED</span>
                </div>
                <p className="text-xs text-secondary/80 leading-relaxed">
                    The synthesized root-cause report was successfully posted to channel{' '}
                    <code className="bg-surface-container-low px-1 rounded text-white font-mono">
                        #vigil-incidents
                    </code>
                    . Postgres checkpointer state finalized and marked healthy.
                </p>
                <div className="bg-surface-container-low/50 border border-surface-container-high/60 rounded-lg p-3 text-[11px] font-mono text-secondary leading-relaxed max-h-36 overflow-y-auto">
                    <div className="flex items-center gap-1.5 text-white/50 mb-2 border-b border-surface-container-high/40 pb-1 text-[9px] font-bold uppercase">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Sent Payload Excerpt</span>
                    </div>
                    {draftRcaReport}
                </div>
            </div>
        );
    }

    // Render Dismissed Confirmation Panel
    if (selectedIncident.status === 'dismissed') {
        return (
            <div className="bg-[#ff6b6b]/5 border border-[#ff6b6b]/30 rounded-xl p-5 relative space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#ff6b6b]">
                    <XCircle className="w-5 h-5 text-[#ff6b6b]" />
                    <span>INCIDENT DISMISSED & CASE ARCHIVED</span>
                </div>
                <p className="text-xs text-secondary/70 leading-relaxed">
                    This alert incident was manually dismissed by the on-call operator. Simulated
                    alerts grouping collapsed, database lock metrics context recycled, and no alerts
                    were broadcasted to downstream systems.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-surface-container-low/60 border border-white/10 rounded-xl p-4 backdrop-blur-md relative space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>HUMAN-IN-THE-LOOP SLACK PUBLISHER</span>
            </div>

            {/* Rich Contrast content container */}
            <Textarea
                id="rca-draft"
                label="EDIT DRAFT SUMMARY REPORT"
                value={draftRcaReport}
                onChange={(e) => setDraftRcaReport(e.target.value)}
                className="w-full h-24"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="destructive" onClick={() => setShowDismissModal(true)}>
                    Dismiss Incident ✖
                </Button>
                <Button variant="primary" onClick={handleApproveSlack}>
                    Approve & Broadcast Slack 🚀
                </Button>
            </div>
        </div>
    );
};
export default SlackPublisher;
