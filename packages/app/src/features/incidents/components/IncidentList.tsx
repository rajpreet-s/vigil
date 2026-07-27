import React from 'react';
import { ListFilter, Clock, Layers, Loader2, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Badge } from '../../../components/ui/Badge';
import { useIncidents } from '../hooks/useIncidents';
import { parseRcaSummary } from '../utils/formatIncident';

interface IncidentListProps {
    isMini?: boolean;
    onExpandList?: () => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({ isMini = false, onExpandList }) => {
    const {
        selectedIncidentId,
        setSelectedIncidentId,
        filterSeverity,
        setFilterSeverity,
        simStep,
        simAlertsCount,
        settleProgress,
    } = useApp();

    const {
        incidents: apiIncidents,
        isLoading,
        isFetchingMore,
        hasMore,
        sentinelRef,
    } = useIncidents({ severity: filterSeverity });

    // Auto-select the first incident from the API if none selected or selected ID invalid
    React.useEffect(() => {
        if (apiIncidents.length > 0 && (!selectedIncidentId || !apiIncidents.some(i => i.id === selectedIncidentId))) {
            setSelectedIncidentId(apiIncidents[0].id);
        }
    }, [apiIncidents, selectedIncidentId, setSelectedIncidentId]);

    // Map API incidents to clean display cards
    const displayIncidents = apiIncidents.map(inc => {
        const parsed = parseRcaSummary(inc.rca_summary, inc.services_affected);
        return {
            id: inc.id,
            shortId: inc.id.length > 12 ? `inc-${inc.id.slice(0, 8)}` : inc.id,
            title: parsed.cleanTitle,
            rootCauseService: parsed.rootCauseService,
            status: inc.status.toLowerCase(),
            severity: 'critical' as const,
            timestamp: new Date(inc.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            alertsCount: inc.anomaly_count,
            servicesAffected: inc.services_affected,
            summarySnippet: (parsed?.cleanSummary || parsed?.q1WhatBroke || '').split('\n')[0].replace(/^•\s*/, ''),
        };
    });

    // Render Compact Mini Strip (56px) when agent trace is expanded on smaller screens
    if (isMini) {
        return (
            <div className="w-[56px] border-r border-surface-container-high/40 flex flex-col items-center justify-between py-3 bg-[#0c0e12]/95 backdrop-blur-md select-none z-10">
                <button
                    onClick={onExpandList}
                    title="Active Outages (Click to Expand List)"
                    className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary transition-all border border-surface-container-highest flex items-center justify-center"
                >
                    <ListFilter className="w-4 h-4" />
                </button>

                <div className="flex-1 w-full flex flex-col items-center justify-start gap-3.5 py-4 overflow-y-auto scrollbar-thin">
                    {displayIncidents.map((inc) => {
                        const isSelected = selectedIncidentId === inc.id;
                        const isInactive = inc.status === 'resolved' || inc.status === 'dismissed';

                        let itemStyle = 'bg-surface-container-high/40 text-secondary border-surface-container-high';
                        if (isSelected) {
                            itemStyle = 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/30 font-bold';
                        } else if (isInactive) {
                            itemStyle = 'bg-surface-container-low text-secondary/40 border-transparent';
                        }

                        return (
                            <button
                                key={inc.id}
                                onClick={() => setSelectedIncidentId(inc.id)}
                                title={`${inc.title} (${inc.timestamp}) - ${inc.rootCauseService}`}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all z-10 hover:scale-105 ${itemStyle}`}
                            >
                                <ShieldAlert className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>

                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    {displayIncidents.length}
                </span>
            </div>
        );
    }

    return (
        <div className="w-72 border-r border-surface-container-high/40 flex flex-col min-w-0 overflow-y-auto bg-[#0c0e12]/80 backdrop-blur-md select-none">
            <div className="p-3.5 border-b border-surface-container-high/40 flex items-center justify-between bg-[#111318]/90 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <ListFilter className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                        Active Outages ({displayIncidents.length})
                    </span>
                </div>
                <div className="flex gap-1 bg-[#0c0e12] p-0.5 rounded-lg border border-surface-container-high">
                    <button
                        onClick={() => setFilterSeverity('all')}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                            filterSeverity === 'all'
                                ? 'bg-surface-container-high text-white shadow-sm'
                                : 'text-secondary/70 hover:text-white'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterSeverity('critical')}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                            filterSeverity === 'critical'
                                ? 'bg-status-critical/20 text-status-critical shadow-sm'
                                : 'text-secondary/70 hover:text-white'
                        }`}
                    >
                        Crit
                    </button>
                </div>
            </div>

            {/* Settle state loading simulation card */}
            {simStep === 1 && (
                <div className="p-3.5 border-b border-status-warning/30 bg-status-warning/10 animate-pulse space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-status-warning font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 animate-spin" />
                            DEBOUNCING INGESTION
                        </span>
                        <span className="text-[10px] bg-status-warning/20 text-status-warning px-1.5 py-0.5 rounded font-mono font-bold">
                            {simAlertsCount} alerts
                        </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">
                        Incoming Alert Storm Ingestion...
                    </h4>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-status-warning h-full transition-all duration-300"
                            style={{ width: `${settleProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {isLoading && displayIncidents.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center gap-3 text-secondary/70">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs font-mono">Fetching telemetry incidents...</span>
                </div>
            ) : (
                <div className="divide-y divide-surface-container-high/30">
                    {displayIncidents.map((inc) => {
                        const isSelected = selectedIncidentId === inc.id;
                        const isInactive = inc.status === 'resolved' || inc.status === 'dismissed';
                        return (
                            <div
                                key={inc.id}
                                onClick={() => setSelectedIncidentId(inc.id)}
                                className={`p-3.5 cursor-pointer transition-all border-b border-surface-container-high/20 ${
                                    isSelected
                                        ? 'bg-primary/10 border-l-4 border-primary shadow-sm'
                                        : 'hover:bg-surface-container-high/20 border-l-4 border-transparent'
                                } ${isInactive ? 'opacity-60 hover:opacity-90' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[10px] font-mono text-primary/80 font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                        {inc.shortId}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <Badge
                                            variant={
                                                inc.severity === 'critical' ? 'critical' : 'warning'
                                            }
                                            category="severity"
                                        >
                                            {inc.severity}
                                        </Badge>
                                        {isInactive && (
                                            <Badge
                                                variant={
                                                    inc.status === 'resolved' ? 'healthy' : 'secondary'
                                                }
                                                category="status"
                                            >
                                                {inc.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-bold text-white leading-snug text-xs tracking-tight mb-1">
                                    {inc.title}
                                </h3>

                                <p className="text-[11px] text-secondary/80 line-clamp-2 mb-2.5 leading-relaxed font-sans">
                                    {inc.summarySnippet}
                                </p>

                                <div className="flex items-center justify-between text-[10px] font-mono text-secondary/60 pt-1 border-t border-surface-container-high/20">
                                    <span className="flex items-center gap-1 text-white/70 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-status-critical" />
                                        {inc.rootCauseService}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-secondary/40" />
                                            {inc.timestamp}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Layers className="w-3 h-3 text-secondary/40" />
                                            {inc.alertsCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Infinite Scroll Sentinel Element */}
                    <div ref={sentinelRef} className="p-3 text-center">
                        {isFetchingMore && (
                            <div className="flex items-center justify-center gap-2 text-xs text-secondary py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                <span>Loading more...</span>
                            </div>
                        )}
                        {!hasMore && displayIncidents.length > 0 && (
                            <span className="text-[10px] text-secondary/40 uppercase tracking-widest font-mono">
                                End of Incidents List
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
