import type {BreadcrumbItem} from '@/types';

export const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Shipments', href: '/shipments' },
];

export const INCOTERMS = [
    { code: 'EXW', name: 'Ex Works' },
    { code: 'FCA', name: 'Free Carrier' },
    { code: 'CPT', name: 'Carriage Paid To' },
    { code: 'CIP', name: 'Carriage and Insurance Paid To' },
    { code: 'DAP', name: 'Delivered at Place' },
    { code: 'DPU', name: 'Delivered at Place Unloaded' },
    { code: 'DDP', name: 'Delivered Duty Paid' },
    { code: 'FAS', name: 'Free Alongside Ship' },
    { code: 'FOB', name: 'Free on Board' },
    { code: 'CFR', name: 'Cost and Freight' },
    { code: 'CIF', name: 'Cost, Insurance and Freight' },
];

export const BRAND_MANAGERS = [
    'Jenevev Dela Cruz',
    'Jonnel Dimagiba',
    'Richard Gomez',
    'Kate Santos',
];

export const emptyForm = {
    shipment_reference: '',
    brand: '',
    incoterm: 'EXW',
    actual_time_of_arrival: '',
    broker_id: '',
    brand_manager: '',
    shipment_type_id: '',
    version: 0,
};