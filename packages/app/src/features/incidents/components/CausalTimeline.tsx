import React from 'react';
import { Clock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const CausalTimeline: React.FC = () => {
    const { selectedIncident } = useApp();

    if (!selectedIncident) return null;

    return (
        <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Cascade Timeline
            </h4>
            <div className="relative border-l border-surface-container-high/50 ml-2 pl-4 space-y-4">
                {selectedIncident.timeline.map((item, idx) => {
                    let badgeEl = null;
                    if (item.status === 'error') {
                        badgeEl = (
                            <span className="inline-block bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                ERR
                            </span>
                        );
                    } else if (item.status === 'warning') {
                        badgeEl = (
                            <span className="inline-block bg-[#f2a93b]/10 text-[#f2a93b] border border-[#f2a93b]/20 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                WRN
                            </span>
                        );
                    } else if (item.status === 'success') {
                        badgeEl = (
                            <span className="inline-block bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                OK
                            </span>
                        );
                    } else {
                        badgeEl = (
                            <span className="inline-block bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mr-2">
                                INF
                            </span>
                        );
                    }

                    return (
                        <div key={idx} className="relative text-xs">
                            <span
                                className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border bg-background flex items-center justify-center ${
                                    item.status === 'error'
                                        ? 'border-[#ff6b6b] bg-[#ff6b6b]/20'
                                        : item.status === 'warning'
                                          ? 'border-[#f2a93b] bg-[#f2a93b]/20'
                                          : item.status === 'success'
                                            ? 'border-[#34d399] bg-[#34d399]/20'
                                            : 'border-[#60a5fa] bg-[#60a5fa]/20'
                                }`}
                            ></span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-secondary/60">
                                    {item.time}
                                </span>
                                <p className="text-white font-medium flex items-center mt-0.5">
                                    {badgeEl}
                                    <span>{item.event}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
