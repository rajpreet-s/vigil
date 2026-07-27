import React from 'react';
import { Clock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const CausalTimeline: React.FC = () => {
    const { selectedIncident } = useApp();

    if (!selectedIncident) return null;

    return (
        <div className="bg-[#111318]/90 border border-surface-container-high/60 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono border-b border-surface-container-high/40 pb-2.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>Cascade Sequence & Telemetry Timeline</span>
            </h4>
            <div className="relative border-l border-surface-container-high/60 ml-2.5 pl-4 space-y-3.5">
                {selectedIncident.timeline.map((item, idx) => {
                    let badgeEl = null;
                    if (item.status === 'error') {
                        badgeEl = (
                            <span className="inline-block bg-status-critical/15 text-status-critical border border-status-critical/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                ERR
                            </span>
                        );
                    } else if (item.status === 'warning') {
                        badgeEl = (
                            <span className="inline-block bg-status-warning/15 text-status-warning border border-status-warning/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                WRN
                            </span>
                        );
                    } else if (item.status === 'success') {
                        badgeEl = (
                            <span className="inline-block bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                OK
                            </span>
                        );
                    } else {
                        badgeEl = (
                            <span className="inline-block bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                INF
                            </span>
                        );
                    }

                    const cleanEvent = item.event.replace(/\*/g, '').replace(/`/g, '');

                    return (
                        <div key={idx} className="relative text-xs">
                            <span
                                className={`absolute -left-[22.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                                    item.status === 'error'
                                        ? 'border-status-critical bg-status-critical/30'
                                        : item.status === 'warning'
                                          ? 'border-status-warning bg-status-warning/30'
                                          : item.status === 'success'
                                            ? 'border-emerald-400 bg-emerald-400/30'
                                            : 'border-blue-400 bg-blue-400/30'
                                }`}
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-secondary/70 font-semibold">
                                    {item.time}
                                </span>
                                <p className="text-white/95 font-sans font-medium flex items-center mt-0.5 leading-snug">
                                    {badgeEl}
                                    <span>{cleanEvent}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
