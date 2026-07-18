import React from 'react';
import { Activity, Server, AlertTriangle, Terminal } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Badge } from '../../../components/ui/Badge';
import { CausalTimeline } from './CausalTimeline';
import { SlackPublisher } from './SlackPublisher';

export const IncidentDetails: React.FC = () => {
    const { selectedIncident } = useApp();

    if (!selectedIncident) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary min-h-[400px]">
                <Activity className="w-12 h-12 mb-3 text-surface-container-highest animate-pulse" />
                <p className="text-sm font-medium">
                    Select or trigger an incident outage to audit workflow
                </p>
            </div>
        );
    }

    return (
        <div className="detail-col flex-1 overflow-y-auto min-h-0 bg-surface-container-lowest/10 border-r border-surface-container-high/40">
            <div className="detail-inner p-6 max-w-3xl space-y-6">
                <div className="border-b border-surface-container-high/40 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-outline-variant/35 text-secondary/70 bg-surface-container-lowest/30">
                            {selectedIncident.id}
                        </span>
                        <Badge
                            variant={
                                selectedIncident.status === 'reviewing'
                                    ? 'critical'
                                    : selectedIncident.status === 'resolved'
                                      ? 'healthy'
                                      : 'secondary'
                            }
                            category="status"
                            animate={selectedIncident.status === 'reviewing'}
                        >
                            {selectedIncident.status === 'reviewing'
                                ? 'REVIEWING'
                                : selectedIncident.status === 'resolved'
                                  ? 'RESOLVED'
                                  : 'DISMISSED'}
                        </Badge>
                    </div>
                    <h2 className="text-xl font-bold font-display text-white mb-2 leading-tight">
                        {selectedIncident.title}
                    </h2>
                    <div className="flex items-center gap-4 text-[11px] text-secondary/70">
                        <div className="flex items-center gap-1 font-mono">
                            <Server className="w-3.5 h-3.5 text-primary/70" />
                            <span>
                                Source:{' '}
                                <strong className="text-white/95">{selectedIncident.source}</strong>
                            </span>
                        </div>
                        <div className="h-3 w-px bg-surface-container-high/60"></div>
                        <div className="flex items-center gap-1 font-mono">
                            <AlertTriangle className="w-3.5 h-3.5 text-primary/70" />
                            <span>
                                Grouped Alerts:{' '}
                                <strong className="text-white/95">
                                    {selectedIncident.alertsCount}
                                </strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Suspected cause highlight */}
                <div className="bg-surface-container-low/40 border border-surface-container-high/30 rounded-xl p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                            <Terminal className="w-4 h-4 text-primary" />
                            <span>AGENT CAUSAL CONCLUSION</span>
                        </div>
                        <Badge
                            variant={
                                selectedIncident.confidence >= 80
                                    ? 'healthy'
                                    : selectedIncident.confidence >= 60
                                      ? 'warning'
                                      : 'critical'
                            }
                            category="confidence"
                        >
                            CONFIDENCE {selectedIncident.confidence}%
                        </Badge>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed mb-4">
                        {selectedIncident.id === 'inc-9283' ? (
                            <>
                                Vigil isolated connection pool depletion on{' '}
                                <code className="bg-surface-container-lowest px-1 rounded text-primary font-mono text-[10px]">
                                    postgres-db-prod
                                </code>
                                . Analysis of service logs and topology shows a latency spike
                                propagation from{' '}
                                <code className="bg-surface-container-lowest px-1 rounded text-primary font-mono text-[10px]">
                                    api-service
                                </code>{' '}
                                caused by database query thread locks. Runbook guidelines suggest
                                pool size recycling.
                            </>
                        ) : selectedIncident.id === 'inc-9279' ? (
                            <>
                                Redis cluster replica lag crossed the 5-second SLA limits. Causal
                                reachability path check indicates an active write buffering delay on
                                the target database nodes. Disk metrics check isolated replica write
                                locks. Recommendation: Restart target replica caches.
                            </>
                        ) : (
                            <>
                                Ingestion analysis complete. Critical gateway latency storm is
                                isolated to service configuration bounds. Causal propagation
                                indicates database connection pool exhaustion back-pressure.
                                Recommend expansion of pool limits and recycling degraded instances.
                            </>
                        )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 border-t border-surface-container-high/20 pt-3">
                        <span className="text-[10px] text-secondary/60 font-mono uppercase">
                            Impacted services:
                        </span>
                        {selectedIncident.impactedServices.map((svc) => (
                            <span
                                key={svc}
                                className="text-[10px] font-mono bg-surface-container-high/80 text-white/90 border border-surface-container-high px-1.5 py-0.5 rounded"
                            >
                                {svc}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <CausalTimeline />

                {/* Slack Human-in-the-loop publisher */}
                <SlackPublisher />
            </div>
        </div>
    );
};
export default IncidentDetails;
