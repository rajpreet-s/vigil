import React from 'react';
import { useApp } from '../../../context/AppContext';
import { Database, Layers, Terminal, Search, BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const NodeAuditLog: React.FC = () => {
    const { activeNode, selectedIncident } = useApp();

    if (!activeNode) return null;

    return (
        <div className="space-y-3 text-xs font-mono">
            {/* Load Node */}
            {activeNode === 'load' && (
                <div className="space-y-2.5">
                    <div className="p-3 bg-[#0c0e12] border border-surface-container-high/60 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-primary text-[11px] font-bold">
                            <Database className="w-3.5 h-3.5" />
                            <span>Alertmanager Ingested Anomalies</span>
                        </div>
                        {selectedIncident?.anomalies && selectedIncident.anomalies.length > 0 ? (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {selectedIncident.anomalies.map((anom: any, idx: number) => (
                                    <div key={idx} className="bg-surface-container-low/60 p-2 rounded-lg border border-surface-container-high/40 text-[10px] flex items-center justify-between">
                                        <div>
                                            <span className="text-amber-400 font-bold">{anom.metric_name}</span> on{' '}
                                            <span className="text-white font-semibold">{anom.service_name}</span>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                            anom.severity === 'CRITICAL' ? 'bg-status-critical/20 text-status-critical' : 'bg-status-warning/20 text-status-warning'
                                        }`}>
                                            {anom.severity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11px] text-secondary/70">
                                Aggregated {selectedIncident?.alertsCount || 0} firing alert anomalies into debouncing settle buffer.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Correlate Node */}
            {activeNode === 'correlate' && (
                <div className="space-y-2.5">
                    <div className="p-3 bg-[#0c0e12] border border-surface-container-high/60 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-bold">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Causal Topology Isolation</span>
                        </div>
                        <div className="bg-surface-container-low/60 p-2.5 rounded-lg border border-surface-container-high/40 space-y-1.5 text-[10px]">
                            <div className="text-secondary/60 uppercase">Causal Cascade Direction</div>
                            <div className="text-white font-bold text-xs font-mono">
                                {selectedIncident?.impactedServices?.length
                                    ? selectedIncident.impactedServices.join(' ➔ ')
                                    : (selectedIncident?.source || 'redis ➔ api_service')}
                            </div>
                        </div>
                        {selectedIncident?.ruled_out && selectedIncident.ruled_out.length > 0 && (
                            <div className="text-[10px] text-secondary/70">
                                <span className="text-emerald-400 font-bold">Ruled Out: </span>
                                {Array.isArray(selectedIncident.ruled_out) ? selectedIncident.ruled_out.join(', ') : String(selectedIncident.ruled_out)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Investigate Node */}
            {activeNode === 'investigate' && (
                <div className="space-y-2.5">
                    <div className="p-3 bg-[#0c0e12] border border-surface-container-high/60 rounded-xl space-y-2 text-[10px]">
                        <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Prometheus Metrics Temporal Isolation</span>
                        </div>
                        <div className="flex items-center justify-between bg-surface-container-low/60 p-2 rounded-lg border border-surface-container-high/40">
                            <span className="text-secondary/70">Primary Service</span>
                            <span className="text-white font-bold">{selectedIncident?.source || selectedIncident?.impactedServices?.[0] || 'redis'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-surface-container-low/60 p-2 rounded-lg border border-surface-container-high/40">
                            <span className="text-secondary/70">Root Cause Metric</span>
                            <span className="text-status-critical font-bold">service_down (1.0)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Retrieval Node */}
            {activeNode === 'retrieval' && (
                <div className="space-y-2.5">
                    <div className="p-3 bg-[#0c0e12] border border-surface-container-high/60 rounded-xl space-y-2 text-[10px]">
                        <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-bold">
                            <Search className="w-3.5 h-3.5" />
                            <span>ChromaDB Vector Runbook Retrieval</span>
                        </div>
                        <div className="bg-surface-container-low/60 p-2.5 rounded-lg border border-surface-container-high/40 space-y-1">
                            <div className="text-secondary/60">Matched Knowledge Document</div>
                            <div className="text-white font-semibold">PostgreSQL Connection Limits & Redis Outage Mitigation</div>
                            <div className="text-emerald-400 text-[9px] font-bold">Vector Similarity: 0.94</div>
                        </div>
                    </div>
                </div>
            )}

            {/* RCA Node */}
            {activeNode === 'rca' && (
                <div className="space-y-2.5">
                    <div className="p-3 bg-[#0c0e12] border border-surface-container-high/60 rounded-xl space-y-2 text-[10px]">
                        <div className="flex items-center gap-2 text-primary text-[11px] font-bold">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Gemini LLM Synthesis</span>
                        </div>
                        <div className="flex items-center justify-between bg-surface-container-low/60 p-2 rounded-lg border border-surface-container-high/40">
                            <span className="text-secondary/70">Reasoning Confidence</span>
                            <span className="text-emerald-400 font-bold">{selectedIncident?.confidence || 90}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Human Review Node */}
            {activeNode === 'human_review' && (
                <div className="space-y-2.5">
                    <div className="p-3 bg-[#0c0e12] border border-surface-container-high/60 rounded-xl space-y-2 text-[10px]">
                        <div className="flex items-center gap-2 text-amber-400 text-[11px] font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Human-in-the-Loop Checkpoint</span>
                        </div>
                        <div className="bg-surface-container-low/60 p-2.5 rounded-lg border border-surface-container-high/40 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-secondary/70">Status</span>
                                <span className="text-white font-bold uppercase">{selectedIncident?.status}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-surface-container-high/40 pt-1">
                                <span className="text-secondary/70">Slack Broadcast</span>
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {selectedIncident?.status === 'resolved' ? 'Sent' : 'Pending Sign-off'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
