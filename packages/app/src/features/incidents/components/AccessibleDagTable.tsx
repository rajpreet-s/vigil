import React from 'react';
import { Badge } from '../../../components/ui/Badge';

export const AccessibleDagTable: React.FC = () => {
    const tableData = [
        {
            node: 'load',
            status: 'completed',
            variant: 'healthy',
            output: '14 alerts ingested successfully',
        },
        {
            node: 'correlate',
            status: 'completed',
            variant: 'healthy',
            output: 'postgres-db-prod mapped',
        },
        {
            node: 'investigate',
            status: 'completed',
            variant: 'healthy',
            output: 'Log check limits reached',
        },
        {
            node: 'retrieval',
            status: 'completed',
            variant: 'healthy',
            output: '2 runbooks matched',
        },
        { node: 'rca', status: 'completed', variant: 'healthy', output: 'Draft summary generated' },
        {
            node: 'human_review',
            status: 'suspended',
            variant: 'warning',
            output: 'Awaiting manual broadcast sign-off',
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
