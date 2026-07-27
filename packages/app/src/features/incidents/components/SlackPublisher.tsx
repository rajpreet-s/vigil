import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    CheckCircle2,
    XCircle,
    FileText,
    Send,
    RefreshCw,
    AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { parseRcaSummary } from '../utils/formatIncident';

export const SlackPublisher: React.FC = () => {
    const {
        selectedIncident,
        draftRcaReport,
        setDraftRcaReport,
        setShowDismissModal,
        handleApproveSlack,
    } = useApp();

    const [isBroadcasting, setIsBroadcasting] = useState(false);

    if (!selectedIncident) return null;

    const parsed = parseRcaSummary(
        selectedIncident.suspectedRootCause || selectedIncident.title,
        selectedIncident.impactedServices,
        selectedIncident.id,
        selectedIncident.fix_steps || []
    );

    // Automatically convert raw summary into Vigil's clean multi-line Slack draft
    useEffect(() => {
        if (selectedIncident.status !== 'resolved' && (!draftRcaReport || !draftRcaReport.includes('Q1 — What broke?'))) {
            setDraftRcaReport(parsed.formattedSlackMrkdwn);
        }
    }, [selectedIncident.id, selectedIncident.status, parsed.formattedSlackMrkdwn, draftRcaReport, setDraftRcaReport]);

    // Render Resolved Confirmation Panel
    if (selectedIncident.status === 'resolved') {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 relative space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-400 font-mono">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>INCIDENT RESOLVED & SLACK BROADCAST DISPATCHED</span>
                </div>
                <p className="text-xs text-secondary/90 leading-relaxed">
                    The LangGraph 4-Question RCA report was successfully published to Slack channel{' '}
                    <code className="bg-[#0c0e12] px-2 py-0.5 rounded text-primary font-mono font-bold border border-primary/20">
                        #vigil-incidents
                    </code>
                    . Postgres checkpointer state updated to resolved.
                </p>
                <div className="bg-[#0c0e12] border border-surface-container-high/60 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 leading-relaxed max-h-44 overflow-y-auto space-y-1.5 whitespace-pre-wrap">
                    <div className="flex items-center gap-1.5 text-secondary/60 pb-1 border-b border-surface-container-high/40 text-[9px] font-bold uppercase">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>Sent Slack Payload</span>
                    </div>
                    <div>{draftRcaReport || parsed.formattedSlackMrkdwn}</div>
                </div>
            </div>
        );
    }

    // Render Dismissed Confirmation Panel
    if (selectedIncident.status === 'dismissed') {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 relative space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2.5 text-xs font-bold text-red-400 font-mono">
                    <XCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                    <span>INCIDENT DISMISSED & CASE ARCHIVED</span>
                </div>
                <p className="text-xs text-secondary/80 leading-relaxed">
                    This alert incident was manually dismissed by the operator. Telemetry anomaly
                    groupings collapsed and database lock metrics recycled without broadcasting
                    alerts.
                </p>
            </div>
        );
    }

    const onApproveClick = async () => {
        setIsBroadcasting(true);
        try {
            await handleApproveSlack();
        } finally {
            setIsBroadcasting(false);
        }
    };

    return (
        <div className="bg-[#111318]/90 border border-surface-container-high/60 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-surface-container-high/40 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide font-mono uppercase">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>Human-in-the-Loop Slack Publisher</span>
                </div>
                <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded font-bold">
                    Target: #vigil-incidents
                </span>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-secondary/70 font-mono uppercase tracking-wider block">
                    Review / Edit RCA Report Draft:
                </label>
                <textarea
                    id="rca-draft"
                    rows={12}
                    value={draftRcaReport || parsed.formattedSlackMrkdwn}
                    onChange={(e) => setDraftRcaReport(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-surface-container-high/80 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-primary transition-all select-text whitespace-pre-wrap"
                />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
                <button
                    type="button"
                    onClick={() => setShowDismissModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold font-mono transition-all flex items-center gap-1.5"
                >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Dismiss Incident</span>
                </button>

                <button
                    type="button"
                    onClick={onApproveClick}
                    disabled={isBroadcasting}
                    className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isBroadcasting ? (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Broadcasting to Slack...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Approve & Broadcast to Slack</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
export default SlackPublisher;
