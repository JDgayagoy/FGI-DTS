import { Archive, Eye, Pencil, Printer, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Shipment } from '@/pages/shipments/types';
import { formatDate, incotermName } from '@/pages/shipments/helpers';
import { StatusIcon } from './status-icon';
import { Highlight } from './highlight';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface ShipmentsTableProps {
    shipments: Shipment[];
    filteredShipments: Shipment[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    sortConfig: SortConfig | null;
    handleSort: (key: string) => void;
    openEditModal: (shipment: Shipment) => void;
    setArchivingShipment: (shipment: Shipment) => void;
    setActiveDocPanel: (index: number) => void;
    setSelectedDocId: (id: null) => void;
}

const SortableHeader = ({
    label,
    sortKey,
    sortConfig,
    onSort,
}: {
    label: string;
    sortKey: string;
    sortConfig: SortConfig | null;
    onSort: (key: string) => void;
}) => (
    <th
        className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer select-none"
        onClick={() => onSort(sortKey)}
    >
        <div className="flex items-center gap-1 whitespace-nowrap">
            {label}{' '}
            {sortConfig?.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </div>
    </th>
);

const TABS = [
    { label: 'All', filter: null },
    { label: 'Completed', filter: 'Completed' },
    { label: 'Processing', filter: 'Processing' },
    { label: 'Pending', filter: 'Pending' },
    { label: 'Failed', filter: 'Failed' },
];

export const ShipmentsTable = ({
    shipments,
    filteredShipments,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    openEditModal,
    setArchivingShipment,
    setActiveDocPanel,
    setSelectedDocId,
}: ShipmentsTableProps) => {
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const { hasPermission } = usePermissions();

    const tabFiltered = activeTab
        ? filteredShipments.filter((s) => s.status.status_name === activeTab)
        : filteredShipments;

    return (
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 shadow-sm">
            {/* Tabs + Search */}
            <div className="flex flex-wrap items-end justify-between border-b border-slate-100 dark:border-slate-800 px-4 pt-3">
                <div className="flex gap-6 text-sm">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.filter;
                        // count per tab
                        const count = tab.filter
                            ? filteredShipments.filter((s) => s.status.status_name === tab.filter).length
                            : filteredShipments.length;
                        return (
                            <button
                                key={tab.label}
                                onClick={() => setActiveTab(tab.filter)}
                                className={cn(
                                    'pb-2 text-xs font-bold tracking-tight relative flex items-center gap-1.5',
                                    isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-slate-400 hover:text-slate-600'
                                )}
                            >
                                {tab.label}
                                <span className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                                    isActive
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'bg-slate-100 text-slate-400'
                                )}>
                                    {count}
                                </span>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="relative mb-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search reference, brand, broker…"
                        className="w-72 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 pl-8 pr-8 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Select
                            </th>
                            <SortableHeader label="SR#" sortKey="shipment_reference" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="Brand" sortKey="brand" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="Incoterm" sortKey="incoterm" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="ATA" sortKey="actual_time_of_arrival" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="Broker" sortKey="broker" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="BM" sortKey="brand_manager" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                            <SortableHeader label="Archived" sortKey="archived_at" sortConfig={sortConfig} onSort={handleSort} />
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Documents
                            </th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {tabFiltered.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-400">
                                    {searchQuery
                                        ? `No shipments match "${searchQuery}"`
                                        : `No ${activeTab ?? ''} shipments found`}
                                </td>
                            </tr>
                        ) : (
                            tabFiltered.map((s) => {
                                const originalIndex = shipments.indexOf(s);
                                const approvedCount = s.documents.filter(
                                    (d) => d.current_status?.status?.status_name?.toLowerCase() === 'approved'
                                ).length;
                                const totalCount = s.documents.length;

                                return (
                                    <tr
                                        key={s.shipment_id}
                                        className="border-b border-slate-50 dark:border-slate-800/40 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <input type="checkbox" className="rounded border-slate-300" />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs font-black text-blue-900 dark:text-blue-300 tracking-tighter">
                                            <Highlight text={s.shipment_reference} query={searchQuery} />
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <Highlight text={s.brand} query={searchQuery} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span title={incotermName(s.incoterm)} className="cursor-help underline decoration-dotted">
                                                <Highlight text={s.incoterm} query={searchQuery} />
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {formatDate(s.actual_time_of_arrival)}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <Highlight text={s.broker} query={searchQuery} />
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <Highlight text={s.brand_manager} query={searchQuery} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <StatusIcon type={s.status.status_name} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs">{formatDate(s.created_at)}</td>
                                        <td className="px-4 py-3 text-xs">{formatDate(s.archived_at)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'text-[10px] font-bold',
                                                    approvedCount === totalCount && totalCount > 0
                                                        ? 'text-green-600'
                                                        : 'text-amber-600'
                                                )}>
                                                    {approvedCount}/{totalCount}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setActiveDocPanel(originalIndex);
                                                        setSelectedDocId(null);
                                                    }}
                                                    className="flex items-center gap-1 rounded-lg border border-purple-200 dark:border-purple-800/40 px-2 py-1 text-[10px] font-bold text-purple-600 hover:bg-purple-50"
                                                >
                                                    <Eye className="h-3 w-3" /> View
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button className="rounded-lg border border-blue-200 dark:border-blue-800/40 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50">
                                                    <Printer className="h-3 w-3 inline mr-1" /> Print
                                                </button>
                                                {hasPermission('edit_shipments') && (
                                                    <button
                                                        onClick={() => openEditModal(s)}
                                                        className="rounded-lg border border-yellow-200 dark:border-yellow-800/40 px-2 py-1 text-[10px] font-bold text-yellow-600 hover:bg-yellow-50"
                                                    >
                                                        <Pencil className="h-3 w-3 inline mr-1" /> Edit
                                                    </button>
                                                )}
                                                {hasPermission('delete_shipments') && (
                                                    <button
                                                        onClick={() => setArchivingShipment(s)}
                                                        disabled={!!s.archived_at}
                                                        className="rounded-lg border border-orange-200 dark:border-orange-800/40 px-2 py-1 text-[10px] font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-40"
                                                    >
                                                        <Archive className="h-3 w-3 inline mr-1" />
                                                        {s.archived_at ? 'Archived' : 'Archive'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/30 dark:bg-slate-900/20 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>
                    Total Shipments:{' '}
                    <span className="text-slate-900 dark:text-white">{tabFiltered.length}</span>
                    {(searchQuery || activeTab) && tabFiltered.length !== shipments.length && (
                        <span className="ml-1 text-xs normal-case">(filtered from {shipments.length})</span>
                    )}
                </span>
            </div>
        </div>
    );
};