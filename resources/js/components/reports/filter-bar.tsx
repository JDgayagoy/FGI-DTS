import { router } from '@inertiajs/react';
import { SlidersHorizontal, RotateCcw, Filter } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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

    // Calculate active filter count (excluding date)
    const activeCount = [brand, brandManager, serviceType, brokerId, archiveStatus].filter(Boolean).length;

    return (
        <div className="flex flex-wrap items-end gap-3">
            {/* Date range - kept outside since it has its own popover picker */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Date Range
                </label>
                <DatePickerWithRange 
                    buttonClassName="h-[34px] w-[210px] rounded-xl border border-slate-200/60 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-slate-300/80 focus:ring-0 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                    initialFrom={activeFilters.dateFrom ?? ''} 
                    initialTo={activeFilters.dateTo ?? ''}
                    onRangeChange={(range) => {
                        setDateFrom(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
                        setDateTo(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
                    }} 
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Additional Filters
                </label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="h-[34px] rounded-xl border-slate-200/60 bg-white px-4 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300"
                        >
                            <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
                            Filter Data
                            {activeCount > 0 && (
                                <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    {activeCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-xl">
                        <DropdownMenuLabel className="text-[10px] font-black tracking-widest uppercase text-slate-400">Filter By</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                            {/* Brand */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-semibold">
                                    Brand
                                    {brand && <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-400">1 selected</span>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48 rounded-xl max-h-[300px] overflow-y-auto">
                                    <DropdownMenuRadioGroup value={brand || 'all'} onValueChange={(v) => setBrand(v === 'all' ? '' : v)}>
                                        <DropdownMenuRadioItem value="all" className="text-[11px]" onSelect={(e) => e.preventDefault()}>All Brands</DropdownMenuRadioItem>
                                        <DropdownMenuSeparator />
                                        {filterOptions.brands.map((b) => (
                                            <DropdownMenuRadioItem key={b} value={b} className="text-[11px]" onSelect={(e) => e.preventDefault()}>{b}</DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {/* Broker */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-semibold">
                                    Broker
                                    {brokerId && <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-400">1 selected</span>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-56 rounded-xl max-h-[300px] overflow-y-auto">
                                    <DropdownMenuRadioGroup value={brokerId || 'all'} onValueChange={(v) => setBrokerId(v === 'all' ? '' : v)}>
                                        <DropdownMenuRadioItem value="all" className="text-[11px]" onSelect={(e) => e.preventDefault()}>All Brokers</DropdownMenuRadioItem>
                                        <DropdownMenuSeparator />
                                        {filterOptions.brokers.map((b) => (
                                            <DropdownMenuRadioItem key={b.id} value={b.id.toString()} className="text-[11px]" onSelect={(e) => e.preventDefault()}>
                                                {b.name}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {/* Brand Manager */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-semibold">
                                    Brand Manager
                                    {brandManager && <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-400">1 selected</span>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48 rounded-xl max-h-[300px] overflow-y-auto">
                                    <DropdownMenuRadioGroup value={brandManager || 'all'} onValueChange={(v) => setBrandManager(v === 'all' ? '' : v)}>
                                        <DropdownMenuRadioItem value="all" className="text-[11px]" onSelect={(e) => e.preventDefault()}>All Brand Managers</DropdownMenuRadioItem>
                                        <DropdownMenuSeparator />
                                        {filterOptions.brandManagers.map((b) => (
                                            <DropdownMenuRadioItem key={b} value={b} className="text-[11px]" onSelect={(e) => e.preventDefault()}>{b}</DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {/* Service Type */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-semibold">
                                    Service Type
                                    {serviceType && <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-400">1 selected</span>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48 rounded-xl max-h-[300px] overflow-y-auto">
                                    <DropdownMenuRadioGroup value={serviceType || 'all'} onValueChange={(v) => setServiceType(v === 'all' ? '' : v)}>
                                        <DropdownMenuRadioItem value="all" className="text-[11px]" onSelect={(e) => e.preventDefault()}>All Types</DropdownMenuRadioItem>
                                        <DropdownMenuSeparator />
                                        {filterOptions.serviceTypes.map((s) => (
                                            <DropdownMenuRadioItem key={s} value={s} className="text-[11px]" onSelect={(e) => e.preventDefault()}>{s}</DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {/* Archive Status */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-semibold">
                                    Archive Status
                                    {archiveStatus && <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-400">1 selected</span>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-40 rounded-xl">
                                    <DropdownMenuRadioGroup value={archiveStatus || 'all'} onValueChange={(v) => setArchiveStatus(v === 'all' ? '' : v)}>
                                        <DropdownMenuRadioItem value="all" className="text-[11px]" onSelect={(e) => e.preventDefault()}>All Shipments</DropdownMenuRadioItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuRadioItem value="active" className="text-[11px]" onSelect={(e) => e.preventDefault()}>Active Only</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="archived" className="text-[11px]" onSelect={(e) => e.preventDefault()}>Archived Only</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>
                        
                    </DropdownMenuContent>
                </DropdownMenu>
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
