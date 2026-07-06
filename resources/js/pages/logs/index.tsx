import { Head, Link } from '@inertiajs/react';
import * as logsRoute from '@/routes/logs';
import { useState } from 'react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Activity, User, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ActivityLogUser {
    id: number;
    name: string;
    email: string;
}

interface ActivityLogEntry {
    id: number;
    user: ActivityLogUser | null;
    action: string;
    description: string;
    subject_type: string | null;
    subject_id: number | null;
    properties: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedLogs {
    data: ActivityLogEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
    from: number | null;
    to: number | null;
}

interface Props {
    logs: PaginatedLogs;
    filters: {
        user_id?: string;
        action?: string;
        date_from?: string;
        date_to?: string;
    };
}

const ACTION_COLORS: Record<string, string> = {
    created:                  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
    updated:                  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
    archived:                 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40',
    deleted:                  'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
    deactivated:              'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
    document_uploaded:        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/40',
    document_status_updated:  'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/40',
    roles_updated:            'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/40',
    permissions_updated:      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/40',
};

function ActionBadge({ action }: { action: string }) {
    const color = ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    const label = action.replace(/_/g, ' ');
    return (
        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', color)}>
            {label}
        </span>
    );
}

function SubjectBadge({ type }: { type: string | null }) {
    if (!type) { return null; }
    const short = type.split('\\').pop() ?? type;
    return (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {short}
        </span>
    );
}

export default function LogsIndex({ logs: paginator, filters }: Props) {
    const [search, setSearch] = useState(filters.action ?? '');
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const filteredLogs = paginator.data.filter((log) => {
        if (search && !log.action.includes(search) && !log.description.toLowerCase().includes(search.toLowerCase())) {
            return false;
        }
        if (dateRange?.from) {
            const logDate = new Date(log.created_at);
            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
            to.setHours(23, 59, 59, 999);
            if (logDate < from || logDate > to) { return false; }
        }
        return true;
    });

    return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#030712] p-6 font-sans text-slate-900 dark:text-slate-100">
            <Head title="Activity Logs" />

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">Activity Logs</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">System-wide audit trail</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="bg-white dark:bg-slate-900/40 pl-9 h-8 border-slate-200 dark:border-slate-800 rounded-lg text-[10px]"
                            placeholder="Search by action or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DatePickerWithRange onRangeChange={setDateRange} />
                </div>
            </div>

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Events', value: paginator.total, icon: Activity },
                    { label: 'Showing', value: paginator.from ? `${paginator.from}–${paginator.to}` : '0', icon: Clock },
                    { label: 'Page', value: `${paginator.current_page} / ${paginator.last_page}`, icon: User },
                ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm">
                        <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <stat.icon className="size-4" />
                        </div>
                        <div>
                            <p className="text-[20px] font-black tracking-tighter text-slate-900 dark:text-white leading-none">{stat.value}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm overflow-hidden">
                <table className="w-full text-left text-[11px]">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60">
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400 text-[9px]">Timestamp</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400 text-[9px]">User</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400 text-[9px]">Action</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400 text-[9px]">Entity</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400 text-[9px]">Description</th>
                            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400 text-[9px]">IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                                    <Activity className="mx-auto mb-3 size-8 opacity-30" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">No activity logs found</p>
                                </td>
                            </tr>
                        )}
                        {filteredLogs.map((log) => (
                            <>
                                <tr
                                    key={log.id}
                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    className={cn(
                                        'border-b border-slate-100 dark:border-slate-800/40 cursor-pointer transition-colors duration-150',
                                        expandedId === log.id
                                            ? 'bg-slate-50 dark:bg-slate-800/30'
                                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/10',
                                    )}
                                >
                                    <td className="px-4 py-3 text-slate-400 font-mono text-[9px] whitespace-nowrap">
                                        {log.created_at ? format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss') : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.user ? (
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">{log.user.name}</p>
                                                <p className="text-[9px] text-slate-400">{log.user.email}</p>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-[9px] italic">System</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ActionBadge action={log.action} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <SubjectBadge type={log.subject_type} />
                                            {log.subject_id && (
                                                <span className="text-[9px] text-slate-400 font-mono">#{log.subject_id}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                        {log.description}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[9px] text-slate-400 whitespace-nowrap">
                                        {log.ip_address ?? '—'}
                                    </td>
                                </tr>
                                {expandedId === log.id && log.properties && (
                                    <tr key={`${log.id}-expanded`} className="bg-slate-50/80 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/40">
                                        <td colSpan={6} className="px-6 py-4">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Changed Properties</p>
                                            <pre className="text-[10px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 rounded-lg p-3 border border-slate-200/60 dark:border-slate-800/60 overflow-x-auto">
                                                {JSON.stringify(log.properties, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {paginator.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold">
                        Showing {paginator.from}–{paginator.to} of {paginator.total} events
                    </p>
                    <div className="flex items-center gap-1">
                        {paginator.links.map((link, i) => {
                            if (!link.url) { return null; }
                            const isArrow = link.label.includes('Previous') || link.label.includes('Next');
                            return (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors border',
                                        link.active
                                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
                                    )}
                                >
                                    {link.label.includes('Previous') ? <ChevronLeft className="size-3" /> :
                                     link.label.includes('Next') ? <ChevronRight className="size-3" /> :
                                     link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

LogsIndex.layout = {
    breadcrumbs: [
        { title: 'Logs', href: logsRoute.index.url() },
        { title: 'Activity', href: logsRoute.index.url() },
    ],
};
