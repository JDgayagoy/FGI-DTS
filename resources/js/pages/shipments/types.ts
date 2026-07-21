export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface DocumentStatusList {
    status_id: number;
    status_name: string;
}

export interface DocumentStatus {
    doc_status_id: number;
    is_current: boolean;
    status: DocumentStatusList;
}

export interface CustomDoc {
    custom_doc_id: number;
    doc_name: string;
    doc_full_name: string;
}

export interface ShipmentDocument {
    shipment_doc_id: number;
    shipment_id: number;
    custom_doc_id: number;
    file_path: string | null;
    file_name: string | null;
    custom_doc: {
        custom_doc_id: number;
        doc_name: string;
        doc_full_name: string;
    };
    current_status: {
        status: {
            status_id: number;
            status_name: string;
        };
    } | null;
}

export interface ShipmentStatus {
    status_id: number;
    status_name: string;
}

export interface ShipmentType {
    shipment_type_id: number;
    shipment_type_name: string;
}

export interface Broker {
    broker_id: number;
    broker_name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    is_active: boolean;
}

export interface Shipment {
    shipment_id: number;
    shipment_reference: string;
    brand: string;
    incoterm: string;
    actual_time_of_arrival: string | null;
    broker_id: number | null;
    broker: Broker | null;
    brand_manager: string;
    created_at: string | null;
    archived_at: string | null;
    status: ShipmentStatus;
    shipment_type: ShipmentType;
    documents: ShipmentDocument[];
}

export interface Props {
    shipments: Paginated<Shipment>;
    shipmentTypes: ShipmentType[];
    brokers: Broker[];
    filters: {
        archive: 'active' | 'archived' | 'all';
        search: string;
        status: string | null;
        sort: string | null;
        direction: 'asc' | 'desc';
    };
    archiveCounts: {
        active: number;
        archived: number;
        all: number;
    };
    statusCounts: {
        all: number;
        Completed: number;
        Processing: number;
        Pending: number;
        Failed: number;
    };
}
