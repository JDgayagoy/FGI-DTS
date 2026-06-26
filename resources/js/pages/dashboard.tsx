import { Head, router } from '@inertiajs/react';

const DOC_KEYS = ['SH', 'SSDT', 'FAN', 'TAN', 'SAD', 'BL', 'FE', 'IV', 'PL', 'CI', 'DH'];

function exportDashboardCSV(shipments: { ref: string; date: string; broker: string; incoterm: string; status: string; docs: Record<string, string> }[]) {
    const headers = ['Reference', 'Date', 'Broker', 'Incoterm', 'Status', ...DOC_KEYS];
    const rows = shipments.map(s => [
        s.ref,
        s.date ?? '',
        s.broker,
        s.incoterm,
        s.status,
        ...DOC_KEYS.map(k => s.docs[k] ?? 'missing'),
    ]);
    const csv = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
import {
    Search, Download, Ship, FileText, X, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AccuracyChart } from '@/components/dashboard/accuracy-chart';
import { CompletionChart } from '@/components/dashboard/completion-chart';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ShipmentsTable } from '@/components/dashboard/shipments-table';
import { StatusIcon } from '@/components/shipments/status-icon';

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

export default function Dashboard({ metrics, shipmentRows, brokers, activeFilters }: Props) {
    const [activeTab, setActiveTab] = useState('All tasks');
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeShipmentIndex, setActiveShipmentIndex] = useState<number | null>(null);
    const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null);
    const itemsPerPage = 20;

    useEffect(() => { setCurrentPage(1); }, [activeTab, dateRange, searchQuery]);

    const handleBrokerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        router.get(
            '/dashboard',
            value ? { broker_id: value } : {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    useEffect(() => {
        if (activeShipmentIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [activeShipmentIndex]);

    const stats = {
        active: metrics.totalDocs,
        uploaded: metrics.uploadedDocs,
        invalid: metrics.rejectedDocs,
        missing: metrics.missingDocs,
        archived: metrics.archivedShipments,
    };

    const filteredShipments = shipmentRows.filter(shipment => {
        if (searchQuery && !shipment.ref?.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (activeTab !== 'All tasks') {
            const tabMapping: Record<string, string> = {
                'Completed': 'completed',
                'In Progress': 'warning',
                'Pending': 'pending',
                'Incomplete': 'error',
            };
            if (shipment.status !== tabMapping[activeTab]) return false;
        }
        if (!dateRange?.from) return true;
        if (!shipment.date) return true;
        const sDate = new Date(shipment.date);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        to.setHours(23, 59, 59, 999);
        return sDate >= from && sDate <= to;
    });

    const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
    const paginatedShipments = filteredShipments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Convert ShipmentRow docs to simple status string for ShipmentsTable
    const paginatedForTable = paginatedShipments.map(s => ({
        ...s,
        docs: Object.fromEntries(
            Object.entries(s.docs).map(([key, info]) => [key, info.status])
        ),
    }));

    const filteredForTable = filteredShipments.map(s => ({
        ...s,
        docs: Object.fromEntries(
            Object.entries(s.docs).map(([key, info]) => [key, info.status])
        ),
    }));

    return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#030712] p-6 font-sans text-slate-900 dark:text-slate-100">
            <Head title="Dashboard" />

            <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Totals</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative w-64 mr-2">
                            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="bg-white dark:bg-slate-900/40 pl-9 h-8 border-slate-200 dark:border-slate-800 rounded-lg text-[10px]"
                                placeholder="Search Reference..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <DatePickerWithRange onRangeChange={setDateRange} />
                        <select
                            value={activeFilters.brokerId ?? ''}
                            onChange={handleBrokerChange}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                        >
                            <option value="">All Brokers</option>
                            {brokers.map((b) => (
                                <option key={b.broker_id} value={String(b.broker_id)}>
                                    {b.broker_name}
                                </option>
                            ))}
                        </select>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-slate-200 dark:border-slate-800 rounded-lg gap-2 px-3 bg-white dark:bg-slate-900/50" onClick={() => exportDashboardCSV(filteredForTable)}>
                            <Download className="size-3.5" /> Export
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                        <CompletionChart />
                        <div className="bg-white dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-center h-[130px] shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Ship className="size-4" />
                                </div>
                                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Active Shipments</span>
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">{metrics.activeShipments}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">out of {metrics.totalShipments}</p>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center shadow-sm">
                        <div className="w-[50%] min-w-0 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/60 p-6">
                            <div className="w-full max-w-[280px]">
                                <AccuracyChart data={stats} />
                            </div>
                        </div>
                        <div className="flex-1 pl-6 flex flex-col justify-center pr-6">
                            {[
                                { label: 'Active Documents', value: metrics.totalDocs },
                                { label: 'Uploaded Documents', value: metrics.uploadedDocs },
                                { label: 'Invalid Documents', value: metrics.rejectedDocs },
                                { label: 'Missing Documents', value: metrics.missingDocs },
                                { label: 'Archived Documents', value: metrics.archivedShipments },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors px-2 rounded">
                                    <span className="text-[32px] font-black tracking-tighter text-[#1e293b] dark:text-blue-400">{stat.value}</span>
                                    <span className="text-[16px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setActiveShipmentIndex(null)}
                >
                    <div
                        className="flex h-[600px] w-[850px] rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Left — Document List */}
                        <div className="flex w-64 flex-shrink-0 flex-col border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/20">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-5 py-4">
                                <div>
                                    <p className="text-xs font-black text-slate-900 dark:text-white tracking-tighter">DOCUMENTS</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[140px]">
                                        {filteredShipments[activeShipmentIndex]?.ref}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="size-7 text-slate-400" onClick={() => setActiveShipmentIndex(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <ul className="flex flex-col gap-1 overflow-y-auto p-3 flex-1">
                                {Object.entries(filteredShipments[activeShipmentIndex]?.docs || {}).map(([key, docInfo]) => {
                                    const isSelected = selectedDocKey === key;
                                    const info = docInfo as DocInfo;
                                    return (
                                        <li
                                            key={key}
                                            onClick={() => setSelectedDocKey(key)}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 relative',
                                                isSelected
                                                    ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60'
                                                    : 'hover:bg-white/50'
                                            )}
                                        >
                                            <StatusIcon type={info.status} />
                                            <div className="flex flex-col min-w-0">
                                                <span className={cn(
                                                    'text-[10px] font-bold truncate',
                                                    isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                                                )}>
                                                    {info.doc_full_name}
                                                </span>
                                                {info.file_name && (
                                                    <span className="text-[9px] text-slate-400 truncate">{info.file_name}</span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="border-t border-slate-100 dark:border-slate-800/60 px-5 py-4">
                                <Button
                                    onClick={() => setActiveShipmentIndex(null)}
                                    className="w-full h-8 text-[10px] font-black uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                >
                                    Close Portal
                                </Button>
                            </div>
                        </div>

                        {/* Right — PDF Preview */}
                        <div className="flex flex-1 flex-col bg-white dark:bg-slate-950">
                            <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">
                                        {selectedDocKey
                                            ? (filteredShipments[activeShipmentIndex]?.docs[selectedDocKey] as DocInfo)?.doc_full_name
                                            : 'PREVIEW PORTAL'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Document Verification</p>
                                </div>
                                {selectedDocKey && (filteredShipments[activeShipmentIndex]?.docs[selectedDocKey] as DocInfo)?.file_path && (
                                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase tracking-widest">
                                        <Printer className="size-3 mr-1" /> Print
                                    </Button>
                                )}
                            </div>

                            <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
                                {selectedDocKey ? (() => {
                                    const docInfo = filteredShipments[activeShipmentIndex]?.docs[selectedDocKey] as DocInfo;
                                    if (docInfo?.file_path && docInfo?.shipment_doc_id) {
                                        return (
                                            <iframe
                                                src={`/shipments/documents/${docInfo.shipment_doc_id}/file`}
                                                className="w-full h-full"
                                                title={docInfo.doc_full_name}
                                            />
                                        );
                                    }
                                    return (
                                        <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
                                            <FileText className="size-10" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No PDF uploaded yet</p>
                                        </div>
                                    );
                                })() : (
                                    <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
                                        <FileText className="size-10" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
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