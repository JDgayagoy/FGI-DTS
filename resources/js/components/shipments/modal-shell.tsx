import { X } from 'lucide-react';
import { type ReactNode } from 'react';

interface ModalShellProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    onSubmit: () => void;
    submitLabel: string;
    children: ReactNode;
    loading?: boolean;
}

export const ModalShell = ({
    title,
    subtitle,
    onClose,
    onSubmit,
    submitLabel,
    children,
    loading = false,
}: ModalShellProps) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            className="w-[520px] rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                <div>
                    <p className="text-sm font-black tracking-tighter">{title}</p>
                    {subtitle && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                <button onClick={onClose}>
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
            </div>

            {children}

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50 dark:bg-slate-900/40">
                <button
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    Cancel
                </button>
                <button
                    onClick={onSubmit}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : submitLabel}
                </button>
            </div>
        </div>
    </div>
);