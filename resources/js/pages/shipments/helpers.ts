import { INCOTERMS } from './constants';
import { type ShipmentDocument } from './types';

export const incotermName = (code: string) =>
    INCOTERMS.find((i) => i.code === code)?.name ?? code;

export const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    });
};

export const toDatetimeLocal = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 16);
};

export const isApproved = (doc: ShipmentDocument) =>
    doc.current_status?.status?.status_name?.toLowerCase() === 'approved';

export const isRejected = (doc: ShipmentDocument) =>
    doc.current_status?.status?.status_name?.toLowerCase() === 'rejected';