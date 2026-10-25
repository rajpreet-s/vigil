import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface GroupedTimelineItem {
    time: string;
    lastTime?: string;
    event: string;
    status: string;
    count: number;
}

export const CausalTimeline: React.FC = () => {
    const { selectedIncident } = useApp();

    const groupedTimeline = useMemo(() => {
        if (!selectedIncident?.timeline) return [];
        const groups: GroupedTimelineItem[] = [];

        selectedIncident.timeline.forEach((item) => {
            const cleanEvent = item.event.replace(/[*`]/g, '').trim();
            const last = groups[groups.length - 1];

            if (last && last.event === cleanEvent && last.status === item.status) {
                last.count += 1;
                last.lastTime = item.time;
            } else {
                groups.push({
                    time: item.time,
                    event: cleanEvent,
                    status: item.status,
                    count: 1,
                });
            }
        });

        return groups;
    }, [selectedIncident?.timeline]);

    if (!selectedIncident) return null;

    const renderTimelineText = (text: string) => {
        // Match known microservices and metric names
        const tokenRegex = /(postgres-db|postgres-primary|payment-service|order-service|api-gateway|auth-service|redis-cache|stripe-gateway|inventory-db|checkout-service|pg_stat_activity_connections_high|High5xxRate|CpuUsageSpike|MemoryPressure)/gi;

        const parts = text.split(tokenRegex);
        return parts.map((part, i) => {
            const lower = part.toLowerCase();
            const isService = /^(postgres-db|postgres-primary|payment-service|order-service|api-gateway|auth-service|redis-cache|stripe-gateway|inventory-db|checkout-service)$/i.test(lower);
            const isMetric = /^(pg_stat_activity_connections_high|High5xxRate|CpuUsageSpike|MemoryPressure)$/i.test(part);

            if (isService) {
                const isOrigin = lower.includes('postgres');
                return (
                    <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-semibold border shadow-2xs ${
                            isOrigin
                                ? 'bg-status-critical-bg text-status-critical border-status-critical/30'
                                : 'bg-surface-container-high text-on-surface border-surface-container-highest'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOrigin ? 'bg-status-critical' : 'bg-status-warning'}`} />
                        {part}
                    </span>
                );
            }

            if (isMetric) {
                return (
                    <code
                        key={i}
                        className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-semibold bg-surface-container-high text-primary border border-surface-container-highest shadow-2xs"
                    >
                        {part}
                    </code>
                );
            }

            return <React.Fragment key={i}>{part}</React.Fragment>;
        });
    };

    return (
        <div className="bg-surface border border-surface-container-high/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high/60 pb-3">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Cascade Sequence & Telemetry Timeline</span>
                </h3>
                <span className="text-[10px] font-mono text-secondary bg-surface-container-high px-2 py-0.5 rounded-full border border-surface-container-highest font-semibold">
                    {selectedIncident.timeline?.length || groupedTimeline.length} Telemetry Events
                </span>
            </div>

            <div className="relative border-l-2 border-surface-container-high ml-3 pl-4 sm:pl-5 space-y-4 pt-1">
                {groupedTimeline.map((item, idx) => {
                    const isLatest = idx === 0;
                    let badgeEl = null;

                    if (item.status === 'error') {
                        badgeEl = (
                            <span className="inline-flex items-center bg-status-critical-bg text-status-critical border border-status-critical/30 px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono mr-1.5 shrink-0 uppercase">
                                CRITICAL
                            </span>
                        );
                    } else if (item.status === 'warning') {
                        badgeEl = (
                            <span className="inline-flex items-center bg-status-warning-bg text-status-warning border border-status-warning/30 px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono mr-1.5 shrink-0 uppercase">
                                WARNING
                            </span>
                        );
                    } else if (item.status === 'success') {
                        badgeEl = (
                            <span className="inline-flex items-center bg-status-healthy-bg text-status-healthy border border-status-healthy/30 px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono mr-1.5 shrink-0 uppercase">
                                RESOLVED
                            </span>
                        );
                    } else {
                        badgeEl = (
                            <span className="inline-flex items-center bg-status-info-bg text-status-info border border-status-info/30 px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono mr-1.5 shrink-0 uppercase">
                                INFO
                            </span>
                        );
                    }

                    return (
                        <div key={idx} className="relative text-xs group">
                            {/* Node Dot on Spine */}
                            <span
                                className={`absolute -left-[23px] sm:-left-[27px] top-1.5 w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all ${
                                    item.status === 'error'
                                        ? 'border-status-critical bg-surface'
                                        : item.status === 'warning'
                                          ? 'border-status-warning bg-surface'
                                          : item.status === 'success'
                                            ? 'border-status-healthy bg-surface'
                                            : 'border-status-info bg-surface'
                                }`}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        item.status === 'error'
                                            ? 'bg-status-critical'
                                            : item.status === 'warning'
                                              ? 'bg-status-warning'
                                              : item.status === 'success'
                                                ? 'bg-status-healthy'
                                                : 'bg-status-info'
                                    } ${isLatest ? 'animate-ping' : ''}`}
                                />
                            </span>

                            <div className="flex flex-col space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-secondary font-bold">
                                        {item.count > 1 && item.lastTime && item.lastTime !== item.time
                                            ? `${item.time} – ${item.lastTime}`
                                            : item.time}
                                    </span>
                                    {isLatest && (
                                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/25 font-bold uppercase">
                                            Latest Alert
                                        </span>
                                    )}
                                </div>

                                <div className="text-on-surface font-sans font-medium flex items-center flex-wrap gap-1.5 leading-relaxed bg-surface-low/80 hover:bg-surface-low border border-surface-container-high/60 rounded-xl p-2.5 sm:p-3 transition-colors">
                                    {badgeEl}
                                    <span className="inline-flex items-center flex-wrap">
                                        {renderTimelineText(item.event)}
                                    </span>
                                    {item.count > 1 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-container-high text-primary border border-surface-container-highest shadow-2xs ml-auto">
                                            ×{item.count} repeated
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
