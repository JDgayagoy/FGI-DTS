import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import type { AppNotification } from '@/types';

interface Props {
    notification: AppNotification;
    onClose: () => void;
}

export function EmailDetailModal({ notification, onClose }: Props) {
    const { data } = notification;
    const emailId = data.shipment_email_id;

    const dismiss = () => {
        router.post(`/shipment-emails/${emailId}/dismiss`, {}, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const createShipment = () => {
        onClose();
        const params = new URLSearchParams();
        if (data.matched_ref) params.set('new_ref', data.matched_ref);
        params.set('email_id', String(emailId));
        router.visit(`/shipments?${params.toString()}`);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-[520px] overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800/60 dark:bg-slate-950"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <p className="text-sm font-black tracking-tighter">Shipment Email Detected</p>
                    <button onClick={onClose}>
                        <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                <div className="space-y-2 px-5 py-4 text-sm">
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="text-slate-400">From</span>
                        <span>{data.from_address}</span>
                        <span className="text-slate-400">Subject</span>
                        <span>{data.subject}</span>
                        <span className="text-slate-400">Received</span>
                        <span>{data.received_at ? new Date(data.received_at).toLocaleString() : '—'}</span>
                        <span className="text-slate-400">Ref found</span>
                        <span>{data.matched_ref ?? '—'}</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                        {data.body_excerpt}
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <button
                        onClick={dismiss}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={createShipment}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        Create Shipment
                    </button>
                </div>
            </div>
        </div>
    );
}
