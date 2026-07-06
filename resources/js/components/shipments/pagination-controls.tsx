import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number | null;
    to: number | null;
    onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, last: number): (number | 'ellipsis')[] {
    if (last <= 7) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (current > 3) pages.push('ellipsis');

    for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) {
        pages.push(p);
    }

    if (current < last - 2) pages.push('ellipsis');

    pages.push(last);

    return pages;
}

export const PaginationControls = ({
    currentPage,
    lastPage,
    total,
    from,
    to,
    onPageChange,
}: PaginationControlsProps) => {
    if (lastPage <= 1) {
        return (
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Total Shipments:{' '}
                <span className="normal-case text-slate-900 dark:text-white">
                    {total}
                </span>
            </span>
        );
    }

    const pages = getPageNumbers(currentPage, lastPage);

    return (
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {from && to ? (
                    <>
                        Showing{' '}
                        <span className="normal-case text-slate-900 dark:text-white">
                            {from}–{to}
                        </span>{' '}
                        of{' '}
                        <span className="normal-case text-slate-900 dark:text-white">
                            {total}
                        </span>
                    </>
                ) : (
                    `Total Shipments: ${total}`
                )}
            </span>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {pages.map((p, i) =>
                    p === 'ellipsis' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold',
                                p === currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40',
                            )}
                        >
                            {p}
                        </button>
                    ),
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= lastPage}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
};