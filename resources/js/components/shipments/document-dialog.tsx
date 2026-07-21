<<<<<<< HEAD
import { CheckCircle, FileText, Upload, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Shipment, type ShipmentDocument } from '@/pages/shipments/types';
import { isApproved, isRejected } from '@/pages/shipments/helpers';
import { DocStatusIndicator } from './doc-status-indicator';
import { useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
=======
import { router } from '@inertiajs/react';
import { CheckCircle, FileText, Upload, X, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isApproved, isRejected } from '@/pages/shipments/helpers';
import type {Shipment, ShipmentDocument} from '@/pages/shipments/types';
import { DocStatusIndicator } from './doc-status-indicator';
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e

interface DocumentDialogProps {
    activeShipment: Shipment;
    selectedDocId: number | null;
    setSelectedDocId: (id: number | null) => void;
    closePanel: () => void;
    handleStatusUpdate: (shipmentDocId: number, statusId: number) => void;
}

export const DocumentDialog = ({
    activeShipment,
    selectedDocId,
    setSelectedDocId,
    closePanel,
    handleStatusUpdate,
}: DocumentDialogProps) => {
    const selectedDoc: ShipmentDocument | null =
        activeShipment.documents.find((d) => d.shipment_doc_id === selectedDocId) ?? null;

<<<<<<< HEAD
    const { auth } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const canUpload = permissions.includes('upload-documents');
    const canApprove = permissions.includes('approve-documents');
    const canReject = permissions.includes('reject-documents');
=======
    const [tab, setTab] = useState<'documents' | 'emails'>('documents');
    const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);
    const emails = activeShipment.emails ?? [];
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file || !selectedDoc) {
return;
}

        const formData = new FormData();
        formData.append('file', file);

        router.post(
            `/shipments/documents/${selectedDoc.shipment_doc_id}/upload`,
            formData,
            { preserveScroll: true, forceFormData: true }
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm"
            onClick={closePanel}
        >
            <div
                className="flex h-[600px] w-[850px] rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left panel — document list */}
                <div className="flex w-64 flex-shrink-0 flex-col border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/20">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-5 py-4">
                        <div>
                            <p className="text-xs font-black tracking-tighter">DOCUMENTS</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                {activeShipment.brand}
                            </p>
                        </div>
                        <button onClick={closePanel}>
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>

                    {emails.length > 0 && (
                        <div className="flex gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800/60">
                            <button
                                onClick={() => setTab('documents')}
                                className={cn(
                                    'rounded-md px-2 py-1 text-[10px] font-black uppercase',
                                    tab === 'documents' ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-400',
                                )}
                            >
                                Documents
                            </button>
                            <button
                                onClick={() => setTab('emails')}
                                className={cn(
                                    'rounded-md px-2 py-1 text-[10px] font-black uppercase',
                                    tab === 'emails' ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-400',
                                )}
                            >
                                Emails
                            </button>
                        </div>
                    )}

                    {tab === 'documents' ? (
                        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                        {activeShipment.documents.map((doc) => {
                            const isSelected = selectedDocId === doc.shipment_doc_id;

                            return (
                                <li
                                    key={doc.shipment_doc_id}
                                    onClick={() => setSelectedDocId(doc.shipment_doc_id)}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                                        isSelected
                                            ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60'
                                            : 'hover:bg-white/50'
                                    )}
                                >
                                    <DocStatusIndicator doc={doc} />
                                    <div className="flex flex-col min-w-0">
                                        <span className={cn(
                                            'text-[10px] font-bold truncate',
                                            isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                                        )}>
                                            {doc.custom_doc.doc_full_name}
                                        </span>
                                        {doc.file_name && (
                                            <span className="text-[9px] text-slate-400 truncate">
                                                {doc.file_name}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                        </ul>
                    ) : (
                        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                            {emails.map((email) => (
                                <li
                                    key={email.id}
                                    onClick={() =>
                                        setExpandedEmailId((id) => (id === email.id ? null : email.id))
                                    }
                                    className="cursor-pointer rounded-xl border border-slate-200/60 p-2 hover:bg-white/50 dark:border-slate-800/60"
                                >
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                        {email.from_address}
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                        {email.subject}
                                        {email.received_at
                                            ? ` · ${new Date(email.received_at).toLocaleString()}`
                                            : ''}
                                    </p>
                                    {expandedEmailId === email.id && (
                                        <p className="mt-1 text-[9px] text-slate-500">
                                            {email.body_excerpt}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800/60 px-5 py-4">
                        <button
                            onClick={closePanel}
                            className="w-full rounded-lg bg-slate-900 dark:bg-white py-2 text-[10px] font-black uppercase text-white dark:text-slate-900"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Right panel — preview */}
                <div className="flex flex-1 flex-col bg-white dark:bg-slate-950">
                    <div className="border-b px-6 py-4 flex items-center justify-between">
                        <h3 className="text-sm font-black">
                            {selectedDoc ? selectedDoc.custom_doc.doc_full_name : 'DOCUMENT PREVIEW'}
                        </h3>
                        {selectedDoc && canUpload && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handleUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 rounded-lg border border-blue-500 px-3 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                                >
                                    <Upload className="h-3 w-3" />
                                    {selectedDoc.file_path ? 'Replace PDF' : 'Upload PDF'}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
                        {selectedDoc ? (
                            selectedDoc.file_path ? (
                                <iframe
                                    src={`/shipments/documents/${selectedDoc.shipment_doc_id}/file`}
                                    className="w-full h-full"
                                    title={selectedDoc.custom_doc.doc_full_name}
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
                                    <FileText className="size-10" />
                                    <p className="text-[10px] font-black uppercase">No PDF uploaded yet</p>
                                    {canUpload && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                                        >
                                            <Upload className="h-3.5 w-3.5" /> Upload PDF
                                        </button>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
                                <FileText className="size-10" />
                                <p className="text-[10px] font-black uppercase">Select a document</p>
                            </div>
                        )}
                    </div>

                    {selectedDoc && (
                        <div className="border-t px-6 py-4 flex justify-between bg-slate-50 dark:bg-slate-900/40">
                            <div className="text-[10px] font-bold text-slate-400">
                                Current:{' '}
                                <span className={cn(
                                    isApproved(selectedDoc) ? 'text-green-600'
                                        : isRejected(selectedDoc) ? 'text-red-500'
                                            : 'text-blue-500'
                                )}>
                                    {selectedDoc.current_status?.status?.status_name || 'No status'}
                                </span>
                            </div>
                            {(canApprove || canReject) && (
                                <div className="flex gap-2">
                                    {canApprove && (
                                        <button
                                            disabled={isApproved(selectedDoc)}
                                            onClick={() => handleStatusUpdate(selectedDoc.shipment_doc_id, 1)}
                                            className="rounded-lg border border-green-500 px-3 py-1 text-[10px] font-bold text-green-600 disabled:opacity-40"
                                        >
                                            <CheckCircle className="h-3 w-3 inline mr-1" /> Approve
                                        </button>
                                    )}
                                    {canReject && (
                                        <button
                                            disabled={isRejected(selectedDoc)}
                                            onClick={() => handleStatusUpdate(selectedDoc.shipment_doc_id, 3)}
                                            className="rounded-lg border border-red-500 px-3 py-1 text-[10px] font-bold text-red-600 disabled:opacity-40"
                                        >
                                            <XCircle className="h-3 w-3 inline mr-1" /> Reject
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};