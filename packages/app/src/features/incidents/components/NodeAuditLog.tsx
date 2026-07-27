import React from 'react';
import { useApp } from '../../../context/AppContext';

export const NodeAuditLog: React.FC = () => {
    const { activeNode, selectedIncident } = useApp();

    if (!activeNode) return null;

    return (
        <div className="space-y-4 text-xs">
            {/* Load Node */}
            {activeNode === 'load' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold uppercase tracking-wider">
                            ALERTMANGER Webhook Ingested Anomalies
                        </p>
                        {selectedIncident?.anomalies && selectedIncident.anomalies.length > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {selectedIncident.anomalies.map((anom: any, idx: number) => (
                                    <div key={idx} className="border-l-2 border-primary/50 pl-2 text-[9.5px]">
                                        <span className="text-[#ffd98a] font-bold">{anom.metric_name}</span> on{' '}
                                        <span className="text-white font-mono">{anom.service_name}</span>{' '}
                                        <span className={`text-[8.5px] px-1 rounded font-bold ${anom.severity === 'CRITICAL' ? 'bg-status-critical/20 text-status-critical' : 'bg-status-warning/20 text-status-warning'}`}>
                                            {anom.severity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-secondary/70">
                                Aggregated {selectedIncident?.alertsCount || 0} alert anomaly events from Alertmanager.
                            </p>
                        )}
                    </div>
                    <div className="text-[10px] text-secondary/60 leading-relaxed font-mono">
                        Vigil loaded {selectedIncident?.alertsCount || selectedIncident?.anomalies?.length || 0} unique alert payloads into correlation buffer.
                    </div>
                </div>
            )}

            {/* Correlate Node */}
            {activeNode === 'correlate' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-2 text-[#c4c6cf]">
                        <p className="text-secondary font-bold uppercase tracking-wider">
                            Topology Correlation & Isolation
                        </p>
                        <div className="border-l border-status-healthy/30 pl-2">
                            <p className="text-white font-bold text-[9.5px]">Path Isolated:</p>
                            <p className="text-secondary mt-0.5 font-mono">
                                {selectedIncident?.impactedServices?.length ? selectedIncident.impactedServices.join(' ➔ ') : (selectedIncident?.source || 'N/A')}
                            </p>
                        </div>
                        {selectedIncident?.blast_radius && selectedIncident.blast_radius.length > 0 && (
                            <div className="border-l border-primary/30 pl-2">
                                <p className="text-white font-bold text-[9.5px]">Blast Radius:</p>
                                <p className="text-secondary mt-0.5 font-mono">
                                    {selectedIncident.blast_radius.join(', ')}
                                </p>
                            </div>
                        )}
                        {selectedIncident?.ruled_out && selectedIncident.ruled_out.length > 0 && (
                            <div className="border-l border-status-critical/30 pl-2">
                                <p className="text-white font-bold text-[9.5px]">Ruled Out:</p>
                                <p className="text-secondary mt-0.5 font-mono">
                                    {JSON.stringify(selectedIncident.ruled_out)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Investigate Node */}
            {activeNode === 'investigate' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold uppercase tracking-wider">PROMETHEUS & ROOT CAUSE ISOLATION</p>
                        <p>
                            <span className="text-[#9e8e7c]">Primary Service:</span>{' '}
                            <span className="text-white font-bold">{selectedIncident?.source || selectedIncident?.impactedServices?.[0] || 'N/A'}</span>
                        </p>
                        {selectedIncident?.root_cause_metric && (
                            <p>
                                <span className="text-[#9e8e7c]">Root Cause Metric:</span>{' '}
                                <span className="text-status-critical">{JSON.stringify(selectedIncident.root_cause_metric)}</span>
                            </p>
                        )}
                        <p>
                            <span className="text-[#9e8e7c]">Started At:</span>{' '}
                            <span className="text-secondary">{selectedIncident?.timestamp || 'N/A'}</span>
                        </p>
                    </div>
                    <div className="text-[10px] text-secondary/60 leading-relaxed font-mono">
                        Temporal and metric correlation script completed for root cause isolation.
                    </div>
                </div>
            )}

            {/* Retrieval Node */}
            {activeNode === 'retrieval' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-2 text-[#c4c6cf]">
                        <p className="text-secondary font-bold uppercase tracking-wider">
                            ChromaDB Runbook Knowledge Base Retrieval
                        </p>
                        <div className="border-l border-primary/30 pl-2 space-y-1">
                            <p className="text-white font-bold text-[9px]">
                                Target Service: <span className="text-primary font-mono">{selectedIncident?.source || 'global'}</span>
                            </p>
                            <p className="text-secondary text-[9px]">
                                Matched runbook context retrieved from vector database for incident evaluation.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* RCA Node */}
            {activeNode === 'rca' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold uppercase tracking-wider">LLM Synthesis & Diagnostics</p>
                        <p>
                            <span className="text-secondary">Confidence Score:</span>{' '}
                            <span className="text-status-healthy font-bold">{selectedIncident?.confidence}%</span>
                        </p>
                        {selectedIncident?.fix_steps && selectedIncident.fix_steps.length > 0 && (
                            <div>
                                <p className="text-secondary font-bold mb-1">Recommended Fix Steps:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-[9.5px] text-white/90">
                                    {selectedIncident.fix_steps.map((step: any, idx: number) => (
                                        <li key={idx}>{typeof step === 'string' ? step : JSON.stringify(step)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Human Review Node */}
            {activeNode === 'human_review' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold uppercase tracking-wider">Human Checkpoint State</p>
                        <p>
                            <span className="text-secondary">Incident Status:</span>{' '}
                            <span className="text-white font-bold uppercase">{selectedIncident?.status}</span>
                        </p>
                        <p>
                            <span className="text-secondary">Incident ID:</span>{' '}
                            <span className="text-secondary font-mono">{selectedIncident?.id}</span>
                        </p>
                        <p>
                            <span className="text-secondary">Action Required:</span>{' '}
                            {selectedIncident?.status === 'resolved' ? 'Slack notification sent' : 'Slack broadcast sign-off'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
