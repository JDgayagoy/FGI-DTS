import { Head, router, useForm } from '@inertiajs/react';
import { Download, Package, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DocumentDialog } from '@/components/shipments/document-dialog';
import { ModalShell } from '@/components/shipments/modal-shell';
import { ShipmentFormFields } from '@/components/shipments/shipment-form-fields';
import { ShipmentsTable } from '@/components/shipments/shipments-table';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import AppLayout from '@/layouts/app-layout';
import { breadcrumbs, emptyForm } from './constants';
import { toDatetimeLocal } from './helpers';
import type { Props, Shipment } from './types';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function exportToPDF(shipments: Shipment[]) {
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = [['SR#', 'Brand', 'Service Type', 'Incoterm', 'ATA', 'Broker', 'Brand Manager', 'Status', 'Created At', 'Archived At', 'Docs Approved/Total']];
    const rows = shipments.map(s => [
        s.shipment_reference,
        s.brand,
        s.shipment_type.shipment_type_name,
        incotermName(s.incoterm),
        formatDate(s.actual_time_of_arrival),
        s.broker?.broker_name ?? '',
        s.brand_manager,
        s.status.status_name,
        formatDate(s.created_at),
        formatDate(s.archived_at),
        `${s.documents.filter(d => d.current_status?.status?.status_name === 'Approved').length}/${s.documents.length}`,
    ]);

    doc.text("Shipments Export", 14, 15);
    autoTable(doc, {
        head: headers,
        body: rows,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`shipments-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function Shipments({
    shipments,
    shipmentTypes,
    brokers,
    filters,
    archiveCounts,
    statusCounts,
}: Props) {
    const [activeDocPanel, setActiveDocPanel] = useState<number | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
    const [archivingShipment, setArchivingShipment] = useState<Shipment | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
    const { data: editForm, setData: setEditForm, patch: patchEdit, errors: editErrors, clearErrors: clearEditErrors, reset: resetEditForm } = useForm({ ...emptyForm });
    const { data: addForm, setData: setAddForm, post: postAdd, processing: addProcessing, errors: addErrors, clearErrors: clearAddErrors, reset: resetAddForm } = useForm({ ...emptyForm });

    const { hasPermission } = usePermissions();

    // Open Add modal pre-filled when arriving from an email notification.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const newRef = params.get('new_ref');
        const emailId = params.get('email_id');

        if (newRef) {
            setAddForm({
                ...emptyForm,
                shipment_reference: newRef,
                shipment_type_id: String(shipmentTypes[0]?.shipment_type_id ?? ''),
            });
            clearAddErrors();
            setShowAddModal(true);

            if (emailId) {
                (window as Window & { __emailId?: string }).__emailId = emailId;
            }

            // Strip query params so a refresh doesn't reopen the modal.
            window.history.replaceState({}, '', '/shipments');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeShipment =
        activeDocPanel !== null ? shipments.data[activeDocPanel] : null;

    const debouncedSearch = useDebouncedValue(searchQuery, 400);
    const isFirstRun = useRef(true);

    const buildQuery = (overrides: Record<string, unknown> = {}) => ({
        ...(filters.archive !== 'active' ? { archive: filters.archive } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.sort ? { sort: filters.sort, direction: filters.direction } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        page: shipments.current_page,
        ...overrides,
    });

    // ── Debounced server-side search ──────────────────────────────────────────
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        router.get(
            '/shipments',
            {
                ...(filters.archive !== 'active' ? { archive: filters.archive } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.sort ? { sort: filters.sort, direction: filters.direction } : {}),
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
                page: 1,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handleSort = (key: string) => {
        if (filters.sort === key && filters.direction === 'desc') {
            // third click clears sort
            router.get('/shipments', buildQuery({ sort: undefined, direction: undefined, page: 1 }), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
            return;
        }

        const direction = filters.sort === key && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get('/shipments', buildQuery({ sort: key, direction, page: 1 }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePageChange = (page: number) => {
        setActiveDocPanel(null);
        setSelectedDocId(null);
        router.get('/shipments', buildQuery({ page }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleTabChange = (status: string | null) => {
        router.get('/shipments', buildQuery({ status: status ?? undefined, page: 1 }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // ── Add / Edit handlers ───────────────────────────────────────────────────
    const openAddModal = () => {
        resetAddForm();
        setAddForm({
            ...emptyForm,
            shipment_type_id: String(shipmentTypes[0]?.shipment_type_id ?? ''),
        });
        clearAddErrors();
        setShowAddModal(true);
    };
    const closeAddModal = () => setShowAddModal(false);
    const handleAddSubmit = () =>
        postAdd('/shipments', {
            onSuccess: () => {
                closeAddModal();
                const emailId = (window as Window & { __emailId?: string }).__emailId;

                if (emailId) {
                    router.post(`/shipment-emails/${emailId}/created`, {}, { preserveScroll: true });
                    delete (window as Window & { __emailId?: string }).__emailId;
                }
            },
        });

    const openEditModal = (shipment: Shipment) => {
        setEditingShipment(shipment);
        resetEditForm();
        setEditForm({
            shipment_reference: shipment.shipment_reference,
            brand: shipment.brand,
            incoterm: shipment.incoterm,
            actual_time_of_arrival: toDatetimeLocal(shipment.actual_time_of_arrival),
            broker_id: String(shipment.broker_id ?? ''),
            brand_manager: shipment.brand_manager,
            shipment_type_id: String(shipment.shipment_type.shipment_type_id),
            version: shipment.version,
        });
        clearEditErrors();
    };
    const closeEditModal = () => setEditingShipment(null);
    const handleEditSubmit = () => {
        if (!editingShipment) return;

        patchEdit(`/shipments/${editingShipment.shipment_id}`, {
            onSuccess: closeEditModal,
        });
    };

    const handleStatusUpdate = (shipmentDocId: number, statusId: number) => {
        router.post(
            `/shipments/documents/${shipmentDocId}/status`,
            { status_id: statusId },
            { preserveScroll: true },
        );
    };

    const handleArchiveFilterChange = (archive: Props['filters']['archive']) => {
        setActiveDocPanel(null);
        setSelectedDocId(null);
        router.get(
            '/shipments',
            buildQuery({ archive: archive !== 'active' ? archive : undefined, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const currentFilter = filters.broker_id
        ? `broker:${filters.broker_id}`
        : filters.archive === 'active'
        ? ''
        : filters.archive;

    const handleFilterChange = (value: string) => {
        if (value.startsWith('broker:')) {
            const brokerId = value.replace('broker:', '');
            router.get('/shipments', buildQuery({ broker_id: brokerId, archive: undefined, page: 1 }), {
                preserveState: true, preserveScroll: true, replace: true,
            });
        } else {
            handleArchiveFilterChange((value || 'active') as Props['filters']['archive']);
        }
    };

    const closePanel = () => {
        setActiveDocPanel(null);
        setSelectedDocId(null);
    };

    return (
        <>
            <Head title="Shipments" />
            <div className="flex min-h-screen flex-col bg-[#F9FAFB] p-6 dark:bg-[#030712]">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-slate-400" />
                        <h1 className="text-2xl font-black tracking-tighter">
                            Shipment Details
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 text-[10px] font-bold"
                            onClick={() => exportToPDF(shipments.data)}
                        >
                            <Download className="size-3.5" /> Export
                        </Button>
                        {hasPermission('add-shipments') && (
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" /> Add Shipment
                            </button>
                        )}
                    </div>
                </div>

                <ShipmentsTable
                    shipments={shipments}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortConfig={filters.sort ? { key: filters.sort, direction: filters.direction } : null}
                    handleSort={handleSort}
                    activeTab={filters.status ?? null}
                    onTabChange={handleTabChange}
                    statusCounts={statusCounts}
                    openEditModal={openEditModal}
                    setArchivingShipment={setArchivingShipment}
                    setActiveDocPanel={setActiveDocPanel}
                    setSelectedDocId={setSelectedDocId}
                    archiveFilter={filters.archive}
                    archiveCounts={archiveCounts}
                    setArchiveFilter={handleArchiveFilterChange}
                    onPageChange={handlePageChange}
                    brokers={brokers}
                    currentFilter={currentFilter}
                    onFilterChange={handleFilterChange}
                    onRestore={(shipment) =>
                        router.patch(
                            `/shipments/${shipment.shipment_id}/restore`,
                            undefined,
                            { preserveScroll: true },
                        )
                    }
                />
            </div>

            {/* Modals (Add, Edit, Archive) */}
            {showAddModal && (
                <ModalShell
                    title="Add Shipment"
                    onClose={closeAddModal}
                    onSubmit={handleAddSubmit}
                    submitLabel="Create Shipment"
                    loading={addProcessing}
                >
                    <ShipmentFormFields
                        form={addForm}
                        setForm={setAddForm}
                        errors={addErrors}
                        shipmentTypes={shipmentTypes}
                        brokers={brokers}
                    />
                </ModalShell>
            )}
            {editingShipment && (
                <ModalShell
                    title="Edit Shipment"
                    subtitle={editingShipment.shipment_reference}
                    onClose={closeEditModal}
                    onSubmit={handleEditSubmit}
                    submitLabel="Save Changes"
                >
                    <ShipmentFormFields
                        form={editForm}
                        setForm={setEditForm}
                        errors={editErrors}
                        shipmentTypes={shipmentTypes}
                        brokers={brokers}
                    />
                </ModalShell>
            )}
            {archivingShipment && (
                <ModalShell
                    title="Archive Shipment"
                    subtitle={`Confirm archive for ${archivingShipment.shipment_reference}`}
                    onClose={() => setArchivingShipment(null)}
                    onSubmit={() =>
                        router.patch(
                            `/shipments/${archivingShipment.shipment_id}/archive`,
                            undefined,
                            { onSuccess: () => setArchivingShipment(null) },
                        )
                    }
                    submitLabel="Archive"
                >
                    <div className="px-5 py-4 text-sm text-slate-600">
                        Are you sure you want to archive this shipment? This
                        action can be reverted later.
                    </div>
                </ModalShell>
            )}

            {/* Document Dialog */}
            {activeShipment && (
                <DocumentDialog
                    activeShipment={activeShipment}
                    selectedDocId={selectedDocId}
                    setSelectedDocId={setSelectedDocId}
                    closePanel={closePanel}
                    handleStatusUpdate={handleStatusUpdate}
                />
            )}
        </>
    );
}

Shipments.layout = (page: ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>
);