import { Archive, Eye, Pencil, Printer, Search, X } from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { formatDate, incotermName } from '@/pages/shipments/helpers';
import type { Shipment } from '@/pages/shipments/types';
import { Highlight } from './highlight';
import { StatusIcon } from './status-icon';

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
    archiveFilter: 'active' | 'archived' | 'all';
    archiveCounts: {
        active: number;
        archived: number;
        all: number;
    };
    setArchiveFilter: (filter: 'active' | 'archived' | 'all') => void;
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
        className="cursor-pointer px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase select-none"
        onClick={() => onSort(sortKey)}
    >
        <div className="flex items-center gap-1 whitespace-nowrap">
            {label}{' '}
            {sortConfig?.key === sortKey &&
                (sortConfig.direction === 'asc' ? '↑' : '↓')}
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

const ARCHIVE_FILTERS = [
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
    { label: 'All', value: 'all' },
] as const;

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
    archiveFilter,
    archiveCounts,
    setArchiveFilter,
}: ShipmentsTableProps) => {
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const { hasPermission } = usePermissions();

    const tabFiltered = activeTab
        ? filteredShipments.filter((s) => s.status.status_name === activeTab)
        : filteredShipments;

    return (
        <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/30">
            {/* Tabs + Search */}
            <div className="flex flex-wrap items-end justify-between border-b border-slate-100 px-4 pt-3 dark:border-slate-800">
                <div className="flex gap-6 text-sm">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.filter;
                        // count per tab
                        const count = tab.filter
                            ? filteredShipments.filter(
                                  (s) => s.status.status_name === tab.filter,
                              ).length
                            : filteredShipments.length;

                        return (
                            <button
                                key={tab.label}
                                onClick={() => setActiveTab(tab.filter)}
                                className={cn(
                                    'relative flex items-center gap-1.5 pb-2 text-xs font-bold tracking-tight',
                                    isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-slate-400 hover:text-slate-600',
                                )}
                            >
                                {tab.label}
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                                        isActive
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-slate-100 text-slate-400',
                                    )}
                                >
                                    {count}
                                </span>
                                {isActive && (
                                    <div className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-blue-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mb-1 flex flex-wrap items-center justify-end gap-2">
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950/40">
                        {ARCHIVE_FILTERS.map((filter) => {
                            const isActive = archiveFilter === filter.value;

                            return (
                                <button
                                    key={filter.value}
                                    onClick={() =>
                                        setArchiveFilter(filter.value)
                                    }
                                    className={cn(
                                        'flex h-8 items-center gap-1.5 rounded-md px-3 text-[10px] font-black tracking-wider uppercase transition-colors',
                                        isActive
                                            ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                                    )}
                                >
                                    {filter.label}
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 py-0.5 text-[9px]',
                                            isActive
                                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                                                : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                        )}
                                    >
                                        {archiveCounts[filter.value]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search reference, brand, broker…"
                            className="w-72 rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-8 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900/40"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20">
                        <tr>
                            <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                Select
                            </th>
                            <SortableHeader
                                label="SR#"
                                sortKey="shipment_reference"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="Brand"
                                sortKey="brand"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="Incoterm"
                                sortKey="incoterm"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="ATA"
                                sortKey="actual_time_of_arrival"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="Broker"
                                sortKey="broker"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="BM"
                                sortKey="brand_manager"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="Status"
                                sortKey="status"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="Created"
                                sortKey="created_at"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                label="Archived"
                                sortKey="archived_at"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                Documents
                            </th>
                            <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {tabFiltered.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={12}
                                    className="px-4 py-10 text-center text-sm text-slate-400"
                                >
                                    {searchQuery
                                        ? `No shipments match "${searchQuery}"`
                                        : `No ${activeTab ?? ''} shipments found`}
                                </td>
                            </tr>
                        ) : (
                            tabFiltered.map((s) => {
                                const originalIndex = shipments.indexOf(s);
                                const approvedCount = s.documents.filter(
                                    (d) =>
                                        d.current_status?.status?.status_name?.toLowerCase() ===
                                        'approved',
                                ).length;
                                const totalCount = s.documents.length;

                                return (
                                    <tr
                                        key={s.shipment_id}
                                        className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/40 dark:hover:bg-slate-800/10"
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs font-black tracking-tighter text-blue-900 dark:text-blue-300">
                                            <Highlight
                                                text={s.shipment_reference}
                                                query={searchQuery}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <Highlight
                                                text={s.brand}
                                                query={searchQuery}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                title={incotermName(s.incoterm)}
                                                className="cursor-help underline decoration-dotted"
                                            >
                                                <Highlight
                                                    text={s.incoterm}
                                                    query={searchQuery}
                                                />
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {formatDate(
                                                s.actual_time_of_arrival,
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <Highlight
                                                text={
                                                    s.broker?.broker_name ?? ''
                                                }
                                                query={searchQuery}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <Highlight
                                                text={s.brand_manager}
                                                query={searchQuery}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <StatusIcon
                                                    type={s.status.status_name}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {formatDate(s.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {formatDate(s.archived_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold',
                                                        approvedCount ===
                                                            totalCount &&
                                                            totalCount > 0
                                                            ? 'text-green-600'
                                                            : 'text-amber-600',
                                                    )}
                                                >
                                                    {approvedCount}/{totalCount}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setActiveDocPanel(
                                                            originalIndex,
                                                        );
                                                        setSelectedDocId(null);
                                                    }}
                                                    className="flex items-center gap-1 rounded-lg border border-purple-200 px-2 py-1 text-[10px] font-bold text-purple-600 hover:bg-purple-50 dark:border-purple-800/40"
                                                >
                                                    <Eye className="h-3 w-3" />{' '}
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button className="rounded-lg border border-blue-200 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:border-blue-800/40">
                                                    <Printer className="mr-1 inline h-3 w-3" />{' '}
                                                    Print
                                                </button>
                                                {hasPermission(
                                                    'edit_shipments',
                                                ) && (
                                                    <button
                                                        onClick={() =>
                                                            openEditModal(s)
                                                        }
                                                        className="rounded-lg border border-yellow-200 px-2 py-1 text-[10px] font-bold text-yellow-600 hover:bg-yellow-50 dark:border-yellow-800/40"
                                                    >
                                                        <Pencil className="mr-1 inline h-3 w-3" />{' '}
                                                        Edit
                                                    </button>
                                                )}
                                                {hasPermission(
                                                    'delete_shipments',
                                                ) && (
                                                    <button
                                                        onClick={() =>
                                                            setArchivingShipment(
                                                                s,
                                                            )
                                                        }
                                                        disabled={
                                                            !!s.archived_at
                                                        }
                                                        className="rounded-lg border border-orange-200 px-2 py-1 text-[10px] font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-40 dark:border-orange-800/40"
                                                    >
                                                        <Archive className="mr-1 inline h-3 w-3" />
                                                        {s.archived_at
                                                            ? 'Archived'
                                                            : 'Archive'}
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
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:border-slate-800 dark:bg-slate-900/20">
                <span>
                    Total Shipments:{' '}
                    <span className="text-slate-900 dark:text-white">
                        {tabFiltered.length}
                    </span>
                    {(searchQuery || activeTab) &&
                        tabFiltered.length !== shipments.length && (
                            <span className="ml-1 text-xs normal-case">
                                (filtered from {shipments.length})
                            </span>
                        )}
                </span>
            </div>
        </div>
    );
};
