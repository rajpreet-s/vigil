import React from 'react';
import { ListFilter, Clock, Layers, Loader2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Badge } from '../../../components/ui/Badge';
import { useIncidents } from '../hooks/useIncidents';

export const IncidentList: React.FC = () => {
    const {
        incidents: contextIncidents,
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

    // Map API incidents to display cards
    const displayIncidents = apiIncidents.map(inc => ({
        id: inc.id,
        title: inc.rca_summary ? inc.rca_summary.split('\n')[0].replace(/^#+\s*/, '') : `Outage on ${inc.services_affected.join(', ') || 'Service'}`,
        status: inc.status.toLowerCase(),
        severity: 'critical' as const,
        timestamp: new Date(inc.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        alertsCount: inc.anomaly_count,
        suspectedRootCause: inc.rca_summary || `Affected services: ${inc.services_affected.join(', ') || 'N/A'}`,
    }));

    return (
        <div className="w-72 border-r border-surface-container-high/40 flex flex-col min-w-0 overflow-y-auto bg-surface-container-lowest/20">
            <div className="p-4 border-b border-surface-container-high/40 flex items-center justify-between bg-surface-container-low/10 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                        Outages List
                    </span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setFilterSeverity('all')}
                        className={`text-[10px] px-2 py-1 rounded transition-all border ${
                            filterSeverity === 'all'
                                ? 'bg-surface-container-high text-primary border-outline-variant/60 font-medium'
                                : 'text-secondary border-transparent hover:text-white'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterSeverity('critical')}
                        className={`text-[10px] px-2 py-1 rounded transition-all border ${
                            filterSeverity === 'critical'
                                ? 'bg-status-critical/15 text-status-critical border-status-critical/20 font-medium'
                                : 'text-secondary border-transparent hover:text-white'
                        }`}
                    >
                        Crit
                    </button>
                </div>
            </div>

            {/* Settle state loading simulation card */}
            {simStep === 1 && (
                <div className="p-4 border-b border-status-warning/20 bg-status-warning/5 animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-status-warning font-semibold">
                            DEBOUNCING INGESTION
                        </span>
                        <span className="text-[10px] bg-status-warning/10 text-status-warning px-1.5 py-0.5 rounded font-mono font-bold">
                            {simAlertsCount} alerts
                        </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-2 truncate">
                        Incoming Alert Storm Ingestion...
                    </h4>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-status-warning h-full transition-all duration-300"
                            style={{ width: `${settleProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {isLoading && displayIncidents.length === 0 ? (
                <div className="p-6 flex flex-col items-center justify-center gap-3 text-secondary">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs">Loading incidents...</span>
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
                                className={`p-4 cursor-pointer transition-all border-b border-surface-container-high/20 ${
                                    isSelected
                                        ? 'bg-surface-container-high/40 border-l-4 border-primary'
                                        : 'hover:bg-surface-container-high/15 border-l-4 border-transparent'
                                } ${isInactive ? 'opacity-50 hover:opacity-80' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="text-[10px] font-mono text-secondary/60 truncate max-w-[100px]">
                                        {inc.id}
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

                                <h3 className="font-bold text-white mb-1 leading-snug text-xs tracking-wide truncate">
                                    {inc.title}
                                </h3>

                                <p className="text-[11px] text-secondary/80 line-clamp-2 mb-3 leading-relaxed">
                                    {inc.suspectedRootCause}
                                </p>

                                <div className="flex items-center gap-3 text-[10px] text-secondary/50 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 opacity-60" />
                                        {inc.timestamp}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Layers className="w-3 h-3 opacity-60" />
                                        {inc.alertsCount} alerts
                                    </span>
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

