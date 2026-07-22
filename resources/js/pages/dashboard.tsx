import { Head, router } from '@inertiajs/react';
import {
    Search, Download, Ship, FileText, X, Printer,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const DOC_KEYS = ['SH', 'SSDT', 'FAN', 'TAN', 'SAD', 'BL', 'FE', 'IV', 'PL', 'CI', 'DH'];

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function exportDashboardPDF(shipments: { ref: string; date: string; broker: string; incoterm: string; status: string; docs: Record<string, string> }[]) {
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = [['Reference', 'Date', 'Broker', 'Incoterm', 'Status', ...DOC_KEYS]];
    const rows = shipments.map(s => [
        s.ref,
        s.date ?? '',
        s.broker,
        s.incoterm,
        s.status,
        ...DOC_KEYS.map(k => s.docs[k] ?? 'missing'),
    ]);

    doc.text("Dashboard Export", 14, 15);
    autoTable(doc, {
        head: headers,
        body: rows,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
}
import { AccuracyChart } from '@/components/dashboard/accuracy-chart';
import { CompletionChart } from '@/components/dashboard/completion-chart';
import { ShipmentsTable } from '@/components/dashboard/shipments-table';
import { StatusIcon } from '@/components/shipments/status-icon';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

interface Metrics {
    totalShipments: number;
    activeShipments: number;
    archivedShipments: number;
    completedShipments: number;
    pendingShipments: number;
    processingShipments: number;
    failedShipments: number;
    totalDocs: number;
    approvedDocs: number;
    pendingDocs: number;
    rejectedDocs: number;
    uploadedDocs: number;
    missingDocs: number;
    completionRate: number;
}

interface DocInfo {
    status: 'ok' | 'error' | 'pending' | 'missing';
    shipment_doc_id: number | null;
    file_path: string | null;
    file_name: string | null;
    doc_full_name: string;
}

interface ShipmentRow {
    shipment_id: number;
    ref: string;
    broker: string;
    date: string;
    broker: string;
    incoterm: string;
    status: 'completed' | 'warning' | 'pending' | 'error';
    docs: Record<string, DocInfo>;
}

interface BrokerOption {
    broker_id: number;
    broker_name: string;
}

interface Props {
    metrics: Metrics;
    shipmentRows: ShipmentRow[];
    brokers: BrokerOption[];
    activeFilters: {
        brokerId: string | null;
    };
    chartData: { date: string; completed: number; total: number }[];
}

const columns = [
    { key: 'SH', label: 'SH' },
    { key: 'SSDT', label: 'SSDT' },
    { key: 'FAN', label: 'FAN' },
    { key: 'TAN', label: 'TAN' },
    { key: 'SAD', label: 'SAD' },
    { key: 'BL', label: 'BL' },
    { key: 'FE', label: 'FE' },
    { key: 'IV', label: 'IV' },
    { key: 'PL', label: 'PL' },
    { key: 'CI', label: 'CI' },
    { key: 'DH', label: 'DH' },
];

export default function Dashboard({ metrics, shipmentRows, brokers, activeFilters, chartData }: Props) {
    const [activeTab, setActiveTab] = useState('All tasks');
    const [dateRange, setDateRange] = useState<
        { from?: Date; to?: Date } | undefined
    >();
    const [searchQuery, setSearchQuery] = useState('');
    const [pageByFilter, setPageByFilter] = useState<Record<string, number>>(
        {},
    );
    const [activeShipmentIndex, setActiveShipmentIndex] = useState<
        number | null
    >(null);
    const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null);
    const itemsPerPage = 10;

    // Derive current page from filter combination
    // When filters change, the key changes and page defaults to 1
    const filterKey = `${activeTab}|${dateRange?.from?.toISOString()}|${dateRange?.to?.toISOString()}|${searchQuery}`;
    const currentPage = pageByFilter[filterKey] ?? 1;

    useEffect(() => {
        setCurrentPage(1); 
    }, [activeTab, dateRange, searchQuery]);

    const handleBrokerChange = (value: string) => {
        router.get(
            '/dashboard',
            value !== 'all' ? { broker_id: value } : {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Handler to update page for current filter combination
    const setCurrentPage = (page: number | ((prev: number) => number)) => {
        setPageByFilter((prev) => {
            const prevPage = prev[filterKey] ?? 1;
            const nextPage = typeof page === 'function' ? page(prevPage) : page;
            
            return {
                ...prev,
                [filterKey]: nextPage,
            };
        });
    };

    // Manage body overflow when detail panel is open
    useEffect(() => {
        if (activeShipmentIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activeShipmentIndex]);

    const stats = {
        active: metrics.totalDocs,
        uploaded: metrics.uploadedDocs,
        invalid: metrics.rejectedDocs,
        missing: metrics.missingDocs,
        archived: metrics.archivedShipments,
    };

    const filteredShipments = shipmentRows.filter((shipment) => {
        if (
            searchQuery &&
            !shipment.ref?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
            return false;
        }

        if (activeTab !== 'All tasks') {
            const tabMapping: Record<string, string> = {
                Completed: 'completed',
                'In Progress': 'warning',
                Pending: 'pending',
                Incomplete: 'error',
            };

            if (shipment.status !== tabMapping[activeTab]) {
                return false;
            }
        }

        if (!dateRange?.from) {
            return true;
        }

        if (!shipment.date) {
            return false;
        }

        const sDate = new Date(shipment.date);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        const to = dateRange.to
            ? new Date(dateRange.to)
            : new Date(dateRange.from);
        to.setHours(23, 59, 59, 999);

        return sDate >= from && sDate <= to;
    });

    const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
    const paginatedShipments = filteredShipments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    // Convert ShipmentRow docs to simple status string for ShipmentsTable
    const paginatedForTable = paginatedShipments.map((s) => ({
        ...s,
        docs: Object.fromEntries(
            Object.entries(s.docs).map(([key, info]) => [key, info.status]),
        ),
    }));

    const filteredForTable = filteredShipments.map((s) => ({
        ...s,
        docs: Object.fromEntries(
            Object.entries(s.docs).map(([key, info]) => [key, info.status]),
        ),
    }));

    return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB] p-6 font-sans text-slate-900 dark:bg-[#030712] dark:text-slate-100">
            <Head title="Dashboard" />

            <div className="mb-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        Totals
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative mr-2 w-64">
                            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="h-8 rounded-lg border-slate-200 bg-white pl-9 text-[10px] dark:border-slate-800 dark:bg-slate-900/40"
                                placeholder="Search Reference..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <DatePickerWithRange onRangeChange={setDateRange} />
                        <Select
                            value={activeFilters.brokerId ?? 'all'}
                            onValueChange={handleBrokerChange}
                        >
                            <SelectTrigger className="h-8 w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                                <SelectValue placeholder="All Brokers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Brokers</SelectItem>
                                {brokers.map((b) => (
                                    <SelectItem key={b.broker_id} value={String(b.broker_id)}>
                                        {b.broker_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-slate-200 dark:border-slate-800 rounded-lg gap-2 px-3 bg-white dark:bg-slate-900/50" onClick={() => exportDashboardPDF(filteredForTable)}>
                            <Download className="size-3.5" /> Export
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
                        <CompletionChart chartData={chartData} />
                        <div className="flex h-[130px] flex-col justify-center rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                    <Ship className="size-4" />
                                </div>
                                <span className="text-[12px] font-bold tracking-widest text-slate-400 uppercase">
                                    Active Shipments
                                </span>
                            </div>
                            <h4 className="mb-1 text-2xl leading-none font-black tracking-tighter text-slate-900 dark:text-white">
                                {metrics.activeShipments}
                            </h4>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                                out of {metrics.totalShipments}
                            </p>
                        </div>
                    </div>

                    <div className="col-span-12 flex items-center rounded-xl border border-slate-200/60 bg-white shadow-sm lg:col-span-8 dark:border-slate-800/60 dark:bg-slate-900/40">
                        <div className="flex w-[50%] min-w-0 flex-col items-center justify-center border-r border-slate-100 p-6 dark:border-slate-800/60">
                            <div className="w-full max-w-[280px]">
                                <AccuracyChart data={stats} />
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-center pr-6 pl-6">
                            {[
                                {
                                    label: 'Active Documents',
                                    value: metrics.totalDocs,
                                },
                                {
                                    label: 'Uploaded Documents',
                                    value: metrics.uploadedDocs,
                                },
                                {
                                    label: 'Invalid Documents',
                                    value: metrics.rejectedDocs,
                                },
                                {
                                    label: 'Missing Documents',
                                    value: metrics.missingDocs,
                                },
                                {
                                    label: 'Archived Documents',
                                    value: metrics.archivedShipments,
                                },
                            ].map((stat, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded border-b border-slate-100 px-2 py-1 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/60 dark:hover:bg-slate-800/10"
                                >
                                    <span className="text-[32px] font-black tracking-tighter text-[#1e293b] dark:text-blue-400">
                                        {stat.value}
                                    </span>
                                    <span className="text-[16px] font-bold tracking-widest text-slate-400 uppercase">
                                        {stat.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <ShipmentsTable
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                paginatedShipments={paginatedForTable}
                filteredShipments={filteredForTable}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                columns={columns}
                setActiveShipmentIndex={setActiveShipmentIndex}
                setSelectedDocKey={setSelectedDocKey}
            />

            {/* Document Dialog */}
            {activeShipmentIndex !== null && (
                <div
                    className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/20 backdrop-blur-sm duration-200 fade-in"
                    onClick={() => setActiveShipmentIndex(null)}
                >
                    <div
                        className="flex h-[600px] w-[850px] animate-in overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-2xl backdrop-blur-xl duration-200 zoom-in-95 dark:border-slate-800/60 dark:bg-slate-950/90"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Left — Document List */}
                        <div className="flex w-64 flex-shrink-0 flex-col border-r border-slate-100 bg-slate-50/30 dark:border-slate-800/60 dark:bg-slate-900/20">
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                                <div>
                                    <p className="text-xs font-black tracking-tighter text-slate-900 dark:text-white">
                                        DOCUMENTS
                                    </p>
                                    <p className="max-w-[140px] truncate text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                                        {
                                            filteredShipments[
                                                activeShipmentIndex
                                            ]?.ref
                                        }
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-slate-400"
                                    onClick={() => setActiveShipmentIndex(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                                {Object.entries(
                                    filteredShipments[activeShipmentIndex]
                                        ?.docs || {},
                                ).map(([key, docInfo]) => {
                                    const isSelected = selectedDocKey === key;
                                    const info = docInfo as DocInfo;

                                    return (
                                        <li
                                            key={key}
                                            onClick={() =>
                                                setSelectedDocKey(key)
                                            }
                                            className={cn(
                                                'relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                                                isSelected
                                                    ? 'border border-slate-200/60 bg-white shadow-sm dark:bg-slate-800'
                                                    : 'hover:bg-white/50',
                                            )}
                                        >
                                            <StatusIcon type={info.status} />
                                            <div className="flex min-w-0 flex-col">
                                                <span
                                                    className={cn(
                                                        'truncate text-[10px] font-bold',
                                                        isSelected
                                                            ? 'text-slate-900 dark:text-white'
                                                            : 'text-slate-500',
                                                    )}
                                                >
                                                    {info.doc_full_name}
                                                </span>
                                                {info.file_name && (
                                                    <span className="truncate text-[9px] text-slate-400">
                                                        {info.file_name}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800/60">
                                <Button
                                    onClick={() => setActiveShipmentIndex(null)}
                                    className="h-8 w-full bg-slate-900 text-[10px] font-black tracking-widest text-white uppercase dark:bg-white dark:text-slate-900"
                                >
                                    Close Portal
                                </Button>
                            </div>
                        </div>

                        {/* Right — PDF Preview */}
                        <div className="flex flex-1 flex-col bg-white dark:bg-slate-950">
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800/60">
                                <div>
                                    <h3 className="text-sm font-black tracking-tighter text-slate-900 dark:text-white">
                                        {selectedDocKey
                                            ? (
                                                  filteredShipments[
                                                      activeShipmentIndex
                                                  ]?.docs[
                                                      selectedDocKey
                                                  ] as DocInfo
                                              )?.doc_full_name
                                            : 'PREVIEW PORTAL'}
                                    </h3>
                                    <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                                        Digital Document Verification
                                    </p>
                                </div>
                                {selectedDocKey &&
                                    (
                                        filteredShipments[activeShipmentIndex]
                                            ?.docs[selectedDocKey] as DocInfo
                                    )?.file_path && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[9px] font-bold tracking-widest uppercase"
                                        >
                                            <Printer className="mr-1 size-3" />{' '}
                                            Print
                                        </Button>
                                    )}
                            </div>

                            <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
                                {selectedDocKey ? (
                                    (() => {
                                        const docInfo = filteredShipments[
                                            activeShipmentIndex
                                        ]?.docs[selectedDocKey] as DocInfo;
                                        
                                        if (
                                            docInfo?.file_path &&
                                            docInfo?.shipment_doc_id
                                        ) {
                                            return (
                                                <iframe
                                                    src={`/shipments/documents/${docInfo.shipment_doc_id}/file`}
                                                    className="h-full w-full"
                                                    title={
                                                        docInfo.doc_full_name
                                                    }
                                                />
                                            );
                                        }

                                        return (
                                            <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
                                                <FileText className="size-10" />
                                                <p className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">
                                                    No PDF uploaded yet
                                                </p>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
                                        <FileText className="size-10" />
                                        <p className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">
                                            Select Document to Initialize
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Overview', href: dashboard() },
    ],
};
