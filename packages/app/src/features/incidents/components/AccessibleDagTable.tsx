import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { useApp } from '../../../context/AppContext';

export const AccessibleDagTable: React.FC = () => {
    const { selectedIncident } = useApp();

    const alertsCount = selectedIncident?.alertsCount || selectedIncident?.anomalies?.length || 0;
    const sourceSvc = selectedIncident?.source || selectedIncident?.impactedServices?.[0] || 'service';
    const isResolved = selectedIncident?.status === 'resolved';

    const tableData = [
        {
            node: 'load',
            status: 'completed',
            variant: 'healthy',
            output: `${alertsCount} alert anomaly payload${alertsCount === 1 ? '' : 's'} ingested`,
        },
        {
            node: 'correlate',
            status: 'completed',
            variant: 'healthy',
            output: selectedIncident?.impactedServices?.length
                ? `${selectedIncident.impactedServices.join(' ➔ ')} mapped`
                : `${sourceSvc} path mapped`,
        },
        {
            node: 'investigate',
            status: 'completed',
            variant: 'healthy',
            output: selectedIncident?.root_cause_metric
                ? `Root cause metric isolated: ${JSON.stringify(selectedIncident.root_cause_metric)}`
                : `Metric logs & root cause check complete for ${sourceSvc}`,
        },
        {
            node: 'retrieval',
            status: 'completed',
            variant: 'healthy',
            output: `Runbook knowledge base query executed for ${sourceSvc}`,
        },
        {
            node: 'rca',
            status: 'completed',
            variant: 'healthy',
            output: selectedIncident?.rca_summary ? 'LLM RCA summary generated' : 'Diagnostic synthesis complete',
        },
        {
            node: 'human_review',
            status: isResolved ? 'completed' : 'suspended',
            variant: isResolved ? 'healthy' : 'warning',
            output: isResolved ? 'Slack broadcast dispatched & marked resolved' : 'Awaiting manual broadcast sign-off',
        },
    ];

    return (
        <div className="overflow-hidden rounded-xl border border-surface-container-high/50 bg-surface-container-low/40 backdrop-blur-md">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                    <tr className="bg-surface-container-high/50 border-b border-surface-container-high text-secondary/70">
                        <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px]">
                            Node
                        </th>
                        <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px] w-24">
                            Status
                        </th>
                        <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px]">
                            Output Description
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/20">
                    {tableData.map((row) => (
                        <tr
                            key={row.node}
                            className="hover:bg-surface-container-high/25 transition-all"
                        >
                            <td className="py-3 px-4 text-white font-bold">{row.node}</td>
                            <td className="py-3 px-4">
                                <Badge variant={row.variant as any} category="status">
                                    {row.status.toUpperCase()}
                                </Badge>
                            </td>
                            <td className="py-3 px-4 text-secondary/85 text-[10.5px] leading-relaxed">
                                {row.output}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
export default AccessibleDagTable;
