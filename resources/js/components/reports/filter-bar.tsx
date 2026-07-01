import { router } from '@inertiajs/react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { FilterOptions, ActiveFilters } from '@/pages/reports/types';

interface Props {
    filterOptions: FilterOptions;
    activeFilters: ActiveFilters;
}

export function FilterBar({ filterOptions, activeFilters }: Props) {
    const [brand, setBrand] = useState(activeFilters.brand ?? '');
    const [brandManager, setBrandManager] = useState(
        activeFilters.brandManager ?? '',
    );
    const [serviceType, setServiceType] = useState(
        activeFilters.serviceType ?? '',
    );
    const [brokerId, setBrokerId] = useState(activeFilters.brokerId ?? '');
    const [dateFrom, setDateFrom] = useState(activeFilters.dateFrom ?? '');
    const [dateTo, setDateTo] = useState(activeFilters.dateTo ?? '');
    const [archiveStatus, setArchiveStatus] = useState(activeFilters.archiveStatus ?? '');

    const apply = () => {
        router.get(
            '/reports',
            {
                brand: brand || undefined,
                brand_manager: brandManager || undefined,
                service_type: serviceType || undefined,
                broker_id: brokerId || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                archive_status: archiveStatus || undefined,
            },
            { preserveState: true },
        );
    };

    const reset = () => {
        setBrand('');
        setBrandManager('');
        setServiceType('');
        setBrokerId('');
        setDateFrom('');
        setDateTo('');
        setArchiveStatus('');
        router.get('/reports');
    };

    return (
        <div className="flex flex-wrap items-end gap-3">
            {/* Date range */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Date From
                </label>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Date To
                </label>
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                />
            </div>

            {/* Brand */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Brand
                </label>
                <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                >
                    <option value="">All Brands</option>
                    {filterOptions.brands.map((b) => (
                        <option key={b}>{b}</option>
                    ))}
                </select>
            </div>

            {/* Broker */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Broker
                </label>
                <select
                    value={brokerId}
                    onChange={(e) => setBrokerId(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                >
                    <option value="">All Brokers</option>
                    {filterOptions.brokers.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Brand Manager */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Brand Manager
                </label>
                <select
                    value={brandManager}
                    onChange={(e) => setBrandManager(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                >
                    <option value="">All Brand Managers</option>
                    {filterOptions.brandManagers.map((b) => (
                        <option key={b}>{b}</option>
                    ))}
                </select>
            </div>

            {/* Service Type */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Service Type
                </label>
                <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                >
                    <option value="">All Types</option>
                    {filterOptions.serviceTypes.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </div>

            {/* Archive Status */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Status
                </label>
                <select
                    value={archiveStatus}
                    onChange={(e) => setArchiveStatus(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                >
                    <option value="">All Shipments</option>
                    <option value="active">Active Only</option>
                    <option value="archived">Archived Only</option>
                </select>
            </div>

            <div className="ml-auto flex gap-2">
                <button
                    onClick={apply}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Apply Filters
                </button>
                <button
                    onClick={reset}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Reset Filters <RotateCcw className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
