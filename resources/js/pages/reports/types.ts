export interface DocumentStatusDist {
    name: string;
    value: number;
    color: string;
}

export interface ChartDataPoint {
    month: string;
    shipments?: number;
    documents?: number;
    completed?: number;
    incomplete?: number;
}

export interface Metrics {
    totalShipments: number;
    completedShipments: number;
    pendingShipments: number;
    processingShipments: number;
    failedShipments: number;
    totalDocs: number;
    approvedDocs: number;
    pendingDocs: number;
    rejectedDocs: number;
    completionRate: number;
}

export interface FilterOptions {
    brands: string[];
    brandManagers: string[];
    serviceTypes: string[];
    brokers: {
        id: string;
        name: string;
    }[];
}

export interface ActiveFilters {
    brand: string | null;
    brandManager: string | null;
    serviceType: string | null;
    brokerId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
}

export interface Props {
    metrics: Metrics;
    charts: {
        completeVsIncomplete: ChartDataPoint[];
        completenessOverTime: ChartDataPoint[];
        documentStatusDist: DocumentStatusDist[];
    };
    filterOptions: FilterOptions;
    activeFilters: ActiveFilters;
}
