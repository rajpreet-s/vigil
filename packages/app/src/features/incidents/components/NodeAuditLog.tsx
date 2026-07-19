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
                        <p className="text-secondary font-bold">
                            ALERTMANGER Webhook Ingest payload
                        </p>
                        <p className="text-[#ffd98a]">{`{`}</p>
                        <p className="pl-4">
                            <span className="text-[#9e8e7c]">"receiver":</span> "vigil-webhook",
                        </p>
                        <p className="pl-4">
                            <span className="text-[#9e8e7c]">"status":</span> "firing",
                        </p>
                        <p className="pl-4">
                            <span className="text-[#9e8e7c]">"alerts":</span> [
                        </p>
                        <p className="pl-8">{`{ "name": "PostgresPoolUsagePercent", "severity": "critical" },`}</p>
                        <p className="pl-8">{`{ "name": "WorkerDBConnectionFailure", "severity": "warning" }`}</p>
                        <p className="pl-4">]</p>
                        <p className="text-[#ffd98a]">{`}`}</p>
                    </div>
                    <div className="text-[10px] text-secondary/60 leading-relaxed font-mono">
                        Vigil loaded {selectedIncident?.alertsCount || 14} unique alert payloads
                        into correlation buffer.
                    </div>
                </div>
            )}

            {/* Correlate Node */}
            {activeNode === 'correlate' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-2 text-[#c4c6cf]">
                        <p className="text-secondary font-bold">
                            Topology correlation path checklist
                        </p>
                        <div className="border-l border-status-healthy/30 pl-2">
                            <p className="text-white font-bold text-[9.5px]">Path Isolated:</p>
                            <p className="text-secondary mt-0.5">postgres ➔ api-service ➔ worker</p>
                        </div>
                        <div className="border-l border-status-healthy/30 pl-2">
                            <p className="text-white font-bold text-[9.5px]">Correlation Reason:</p>
                            <p className="text-secondary mt-0.5">
                                Temporal overlap &lt; 45s with path reachability topology
                                constraints.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Investigate Node */}
            {activeNode === 'investigate' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold">PROMETHEUS TOOL LOOP QUERY LOGS</p>
                        <p>
                            <span className="text-[#9e8e7c]">12:15:30.091</span>{' '}
                            <span className="text-[#ffd98a]">GET</span> /metrics/postgres_pool
                        </p>
                        <p>
                            <span className="text-[#9e8e7c]">12:15:30.120</span>{' '}
                            <span className="text-status-critical">[POOL_WARN]</span>{' '}
                            active_connections: 98/100
                        </p>
                        <p>
                            <span className="text-[#9e8e7c]">12:15:30.150</span>{' '}
                            <span className="text-status-healthy">[SUCCESS]</span> isolated slow
                            transaction #1042
                        </p>
                    </div>
                    <div className="text-[10px] text-secondary/60 leading-relaxed font-mono">
                        Low-confidence path triggered Prometheus investigation script automatically.
                    </div>
                </div>
            )}

            {/* Retrieval Node */}
            {activeNode === 'retrieval' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-2 text-[#c4c6cf]">
                        <p className="text-secondary font-bold">
                            ChromaDB semantic runbook matches
                        </p>
                        <div className="border-l border-primary/30 pl-2">
                            <p className="text-white font-bold text-[9px]">
                                runbook_postgres_limits.md
                            </p>
                            <p className="text-secondary text-[9px] mt-0.5">
                                Similarity distance score: <strong>0.94</strong>
                            </p>
                        </div>
                        <div className="border-l border-primary/30 pl-2">
                            <p className="text-white font-bold text-[9px]">
                                runbook_db_replicas.md
                            </p>
                            <p className="text-secondary text-[9px] mt-0.5">
                                Similarity distance score: <strong>0.72</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* RCA Node */}
            {activeNode === 'rca' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold">LLM Synthesis metrics</p>
                        <p>
                            <span className="text-secondary">Model:</span> Claude-3-5-sonnet
                        </p>
                        <p>
                            <span className="text-secondary">Prompt tokens:</span> 1,402
                        </p>
                        <p>
                            <span className="text-secondary">Completion tokens:</span> 248
                        </p>
                        <p>
                            <span className="text-secondary">Synthesis Latency:</span> 1.25s
                        </p>
                    </div>
                </div>
            )}

            {/* Human Review Node */}
            {activeNode === 'human_review' && (
                <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-md font-mono text-[10px] space-y-1.5 text-[#c4c6cf]">
                        <p className="text-secondary font-bold">Human checkpoint state</p>
                        <p>
                            <span className="text-secondary">State Status:</span> Suspended
                            (Awaiting operator review)
                        </p>
                        <p>
                            <span className="text-secondary">Required Action:</span> Slack broadcast
                            approval
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
