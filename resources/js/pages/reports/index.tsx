import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { type ReactNode } from 'react';
import { FileBarChart2 } from 'lucide-react';

import { type Props } from './types';
import { breadcrumbs } from './constants';

import { FilterBar } from '@/components/reports/filter-bar';
import { MetricRadialChart } from '@/components/reports/metric-radial-chart';
import { MetricCard } from '@/components/reports/metric-card';
import { CompletenessChart } from '@/components/reports/completeness-chart';
import { CompleteVsIncompleteChart } from '@/components/reports/complete-vs-incomplete-chart';
import { DocumentStatusChart } from '@/components/reports/document-status-chart';

export default function Reports({ metrics, charts, filterOptions, activeFilters }: Props) {
    const shipmentChartConfig = {
        completed: { label: "Completed", color: "#3b82f6" },
        pending: { label: "Pending", color: "#eab308" },
        processing: { label: "Processing", color: "#a855f7" },
    };
    const shipmentChartData = [{
        name: "shipments",
        completed: metrics.completedShipments,
        pending: metrics.pendingShipments,
        processing: metrics.processingShipments,
    }];
    
    const documentChartConfig = {
        approved: { label: "Approved", color: "#22c55e" },
        pending: { label: "Pending", color: "#eab308" },
        rejected: { label: "Rejected", color: "#ef4444" },
    };
    const documentChartData = [{
        name: "documents",
        approved: metrics.approvedDocs,
        pending: metrics.pendingDocs,
        rejected: metrics.rejectedDocs,
    }];
    const shipmentMetrics = [
        { label: 'Completed Shipments', value: metrics.completedShipments, percentage: metrics.totalShipments ? Math.round((metrics.completedShipments / metrics.totalShipments) * 100) : 0 },
        { label: 'Pending Shipments', value: metrics.pendingShipments, percentage: metrics.totalShipments ? Math.round((metrics.pendingShipments / metrics.totalShipments) * 100) : 0 },
        { label: 'Processing Shipments', value: metrics.processingShipments, percentage: metrics.totalShipments ? Math.round((metrics.processingShipments / metrics.totalShipments) * 100) : 0 },
    ];

    const documentMetrics = [
        { label: 'Required Documents', value: metrics.totalDocs, percentage: 100 },
        { label: 'Approved Documents', value: metrics.approvedDocs, percentage: metrics.totalDocs ? Math.round((metrics.approvedDocs / metrics.totalDocs) * 100) : 0 },
        { label: 'Pending Documents', value: metrics.pendingDocs, percentage: metrics.totalDocs ? Math.round((metrics.pendingDocs / metrics.totalDocs) * 100) : 0 },
        { label: 'Rejected Documents', value: metrics.rejectedDocs, percentage: metrics.totalDocs ? Math.round((metrics.rejectedDocs / metrics.totalDocs) * 100) : 0 },
    ];

    return (
        <>
            <Head title="Reports" />
            <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#030712] p-6 gap-5 font-sans text-slate-900 dark:text-slate-100">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <FileBarChart2 className="h-6 w-6 text-slate-400" />
                    <h1 className="text-2xl font-black tracking-tighter text-slate-800 dark:text-slate-200">Reports</h1>
                </div>

                {/* Filters */}
                <FilterBar filterOptions={filterOptions} activeFilters={activeFilters} />

                {/* Charts */}
                <div className="grid grid-cols-3 gap-4">
                    <CompletenessChart data={charts.completenessOverTime} />
                    <CompleteVsIncompleteChart data={charts.completeVsIncomplete} />
                    <DocumentStatusChart data={charts.documentStatusDist} />
                </div>

                {/* Shipment Metrics */}
                <div>
                    <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-slate-200 mb-3">Shipment Metrics</h2>
                    <div className="flex gap-4">
                        {/* Stacked Radial */}
                        <div className="flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm px-6 py-4 min-w-[280px]">
                            <MetricRadialChart 
                                chartData={shipmentChartData} 
                                chartConfig={shipmentChartConfig} 
                                totalValue={metrics.totalShipments} 
                                totalLabel="Shipments" 
                                dataKeys={['processing', 'pending', 'completed']} 
                            />
                        </div>
                        {shipmentMetrics.map((m) => (
                            <MetricCard key={m.label} label={m.label} value={m.value} percentage={m.percentage} total={metrics.totalShipments} />
                        ))}
                    </div>
                </div>

                {/* Document Metrics */}
                <div>
                    <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-slate-200 mb-3">Document Metrics</h2>
                    <div className="flex gap-4">
                        {/* Stacked Radial */}
                        <div className="flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm px-6 py-4 min-w-[280px]">
                            <MetricRadialChart 
                                chartData={documentChartData} 
                                chartConfig={documentChartConfig} 
                                totalValue={metrics.totalDocs} 
                                totalLabel="Documents" 
                                dataKeys={['rejected', 'pending', 'approved']} 
                            />
                        </div>
                        {documentMetrics.map((m) => (
                            <MetricCard key={m.label} label={m.label} value={m.value} percentage={m.percentage} total={metrics.totalDocs} />
                        ))}
                    </div>
                </div>

            </div>
        </>
    );
}

Reports.layout = (page: ReactNode) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;