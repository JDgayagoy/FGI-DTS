import { ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import { StatusIcon } from '@/components/shipments/status-icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Shipment {
    date: string;
    ref: string;
    broker: string;
    incoterm: string;
    status: 'completed' | 'pending' | 'warning' | 'error';
    docs: Record<string, string>;
}

interface Column {
    key: string;
    label: string;
}

interface ShipmentsTableProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    currentPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    paginatedShipments: Shipment[];
    filteredShipments: Shipment[];
    totalPages: number;
    itemsPerPage: number;
    columns: Column[];
    setActiveShipmentIndex: (index: number | null) => void;
    setSelectedDocKey: (key: string | null) => void;
}

export function ShipmentsTable({
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    paginatedShipments,
    filteredShipments,
    totalPages,
    itemsPerPage,
    columns,
    setActiveShipmentIndex,
    setSelectedDocKey,
}: ShipmentsTableProps) {
    return (
        <div className="flex flex-col mb-8 rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/30">
            <div className="flex flex-col justify-between border-b border-slate-100 px-4 pt-3 dark:border-slate-800 sm:flex-row sm:items-center">
                <div className="flex gap-6">
                    {['All tasks', 'Completed', 'In Progress', 'Pending', 'Incomplete'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'relative pb-3 text-xs font-bold tracking-tight transition-all',
                                activeTab === tab
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-400 hover:text-slate-600'
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="-mt-1 mb-2 flex items-center gap-2 sm:mb-0">
                    <Button variant="outline" size="sm" className="mb-2 h-7 gap-1 rounded-md px-3 text-[10px] font-bold">
                        <Download className="size-3" /> Export
                    </Button>
                    <div className="mb-2 ml-2 flex border-l border-slate-200 pl-2 dark:border-slate-800">
                        <Button variant="ghost" size="icon" className="size-7 text-slate-300">
                            <ChevronLeft className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-slate-600">
                            <ChevronRight className="size-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20">
                            <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">ATA</th>
                            <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">SR#</th>
                            <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Broker</th>
                            <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Incoterm</th>
                            {columns.map((col) => (
                                <th key={col.key} className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{col.label}</th>
                            ))}
                            <th className="px-6 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</th>
                            <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {paginatedShipments.map((shipment, index) => (
                            <tr key={index} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/40 dark:hover:bg-slate-800/10">
                                <td className="px-6 py-3 text-[11px] font-bold text-slate-400 transition-colors group-hover:text-slate-600">
                                    {new Date(shipment.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                                </td>
                                <td className="px-6 py-3 text-xs font-black tracking-tighter text-blue-900 dark:text-blue-300">{shipment.ref}</td>
                                <td className="px-6 py-3 text-[11px] font-bold text-slate-500">{shipment.broker}</td>
                                <td className="px-6 py-3 text-[11px] font-bold text-slate-500">{shipment.incoterm}</td>
                                {columns.map((col) => (
                                    <td key={col.key} className="px-2 py-3">
                                        <div className="flex justify-center">
                                            <StatusIcon type={shipment.docs[col.key]} />
                                        </div>
                                    </td>
                                ))}
                                <td className="px-6 py-3">
                                    <div className="flex justify-center">
                                        <StatusIcon type={shipment.status} />
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                            setActiveShipmentIndex(globalIndex);
                                            setSelectedDocKey(null);
                                        }}
                                        className="size-8 shadow-none text-slate-300 transition-all group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-900/20"
                                    >
                                        <Eye className="size-3.5" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/20">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Showing <span className="text-blue-600 dark:text-blue-400">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredShipments.length)}</span> of {filteredShipments.length} shipments
                    </span>
                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Page <span className="font-black text-slate-900 dark:text-slate-100">{currentPage}</span> of {totalPages}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-slate-200 disabled:opacity-30 dark:border-slate-800"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="size-3.5" />
                    </Button>

                    <div className="mx-2 flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) {
                                pageNum = currentPage - 2 + i;
                                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={cn(
                                        'size-8 rounded-lg text-[11px] font-bold transition-all',
                                        currentPage === pageNum
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    )}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-slate-200 disabled:opacity-30 dark:border-slate-800"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
