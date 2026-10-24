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
        const parts = text.split(/(postgres-primary|checkout-service|payment-gateway|inventory-db|auth-service|api-gateway)/g);
        return parts.map((part, i) => {
            if (/^(postgres-primary|checkout-service|payment-gateway|inventory-db|auth-service|api-gateway)$/.test(part)) {
                return (
                    <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-semibold bg-surface-container-highest text-primary border border-surface-container-highest/80 shadow-2xs"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {part}
                    </span>
                );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
        });
    };

    return (
        <div className="bg-surface-container/90 border border-surface-container-high/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 font-mono border-b border-surface-container-high/40 pb-2.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>Cascade Sequence & Telemetry Timeline</span>
            </h4>
            <div className="relative border-l border-surface-container-high/60 ml-2.5 pl-4 space-y-3.5">
                {groupedTimeline.map((item, idx) => {
                    let badgeEl = null;
                    if (item.status === 'error') {
                        badgeEl = (
                            <span className="inline-block bg-status-critical/15 text-status-critical border border-status-critical/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-1.5 flex-shrink-0">
                                ERR
                            </span>
                        );
                    } else if (item.status === 'warning') {
                        badgeEl = (
                            <span className="inline-block bg-status-warning/15 text-status-warning border border-status-warning/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-1.5 flex-shrink-0">
                                WRN
                            </span>
                        );
                    } else if (item.status === 'success') {
                        badgeEl = (
                            <span className="inline-block bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-1.5 flex-shrink-0">
                                OK
                            </span>
                        );
                    } else {
                        badgeEl = (
                            <span className="inline-block bg-blue-500/15 text-blue-500 border border-blue-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-1.5 flex-shrink-0">
                                INF
                            </span>
                        );
                    }

                    return (
                        <div key={idx} className="relative text-xs">
                            <span
                                className={`absolute -left-[22.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                                    item.status === 'error'
                                        ? 'border-status-critical bg-status-critical/30'
                                        : item.status === 'warning'
                                          ? 'border-status-warning bg-status-warning/30'
                                          : item.status === 'success'
                                            ? 'border-emerald-500 bg-emerald-500/30'
                                            : 'border-blue-500 bg-blue-500/30'
                                }`}
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-secondary font-semibold">
                                    {item.count > 1 && item.lastTime && item.lastTime !== item.time
                                        ? `${item.time} – ${item.lastTime}`
                                        : item.time}
                                </span>
                                <div className="text-on-surface font-sans font-medium flex items-center flex-wrap gap-1 mt-0.5 leading-snug">
                                    {badgeEl}
                                    <span className="inline-flex items-center flex-wrap">{renderTimelineText(item.event)}</span>
                                    {item.count > 1 && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-container-highest text-secondary border border-surface-container-highest/80 shadow-2xs">
                                            ×{item.count}
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
