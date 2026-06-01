import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Calendar, Download, Eye, Package, Plus } from 'lucide-react';
import { type ReactNode, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';

import { type Props, type Shipment } from './types';
import { breadcrumbs, emptyForm } from './constants';
import { toDatetimeLocal, incotermName } from './helpers';

import { ShipmentFormFields } from '@/components/shipments/shipment-form-fields';
import { ModalShell } from '@/components/shipments/modal-shell';
import { DocumentDialog } from '@/components/shipments/document-dialog';
import { ShipmentsTable } from '@/components/shipments/shipments-table';

export default function Shipments({ shipments, shipmentTypes }: Props) {
    const [activeDocPanel, setActiveDocPanel] = useState<number | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
    const [archivingShipment, setArchivingShipment] = useState<Shipment | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [editForm, setEditForm] = useState({ ...emptyForm });
    const [addForm, setAddForm] = useState({ ...emptyForm });

    const { hasPermission } = usePermissions();

    const activeShipment = activeDocPanel !== null ? shipments[activeDocPanel] : null;

    // ── Search, filter, sort ──────────────────────────────────────────────────
    const filteredShipments = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let result = shipments;
        if (q) {
            result = shipments.filter((s) =>
                [
                    s.shipment_reference,
                    s.brand,
                    s.incoterm,
                    incotermName(s.incoterm),
                    s.broker,
                    s.brand_manager,
                    s.status.status_name,
                    s.shipment_type.shipment_type_name,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(q)
            );
        }
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortConfig.key) {
                    case 'shipment_reference':
                    case 'brand':
                    case 'broker':
                    case 'brand_manager':
                        aVal = a[sortConfig.key as keyof Shipment];
                        bVal = b[sortConfig.key as keyof Shipment];
                        break;
                    case 'incoterm':
                        aVal = incotermName(a.incoterm);
                        bVal = incotermName(b.incoterm);
                        break;
                    case 'actual_time_of_arrival':
                    case 'created_at':
                    case 'archived_at':
                        aVal = a[sortConfig.key as keyof Shipment] ? new Date(a[sortConfig.key as keyof Shipment] as string).getTime() : 0;
                        bVal = b[sortConfig.key as keyof Shipment] ? new Date(b[sortConfig.key as keyof Shipment] as string).getTime() : 0;
                        break;
                    case 'status':
                        aVal = a.status.status_name;
                        bVal = b.status.status_name;
                        break;
                    case 'shipment_type':
                        aVal = a.shipment_type.shipment_type_name;
                        bVal = b.shipment_type.shipment_type_name;
                        break;
                    default:
                        aVal = a[sortConfig.key as keyof Shipment];
                        bVal = b[sortConfig.key as keyof Shipment];
                }
                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                const comparison = aVal < bVal ? -1 : 1;
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return result;
    }, [shipments, searchQuery, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    // ── Add / Edit handlers ───────────────────────────────────────────────────
    const openAddModal = () => {
        setAddForm({ ...emptyForm, shipment_type_id: String(shipmentTypes[0]?.shipment_type_id ?? '') });
        setShowAddModal(true);
    };
    const closeAddModal = () => setShowAddModal(false);
    const handleAddSubmit = () => router.post('/shipments', addForm, { onSuccess: closeAddModal });

    const openEditModal = (shipment: Shipment) => {
        setEditingShipment(shipment);
        setEditForm({
            shipment_reference: shipment.shipment_reference,
            brand: shipment.brand,
            incoterm: shipment.incoterm,
            actual_time_of_arrival: toDatetimeLocal(shipment.actual_time_of_arrival),
            broker: shipment.broker,
            brand_manager: shipment.brand_manager,
            shipment_type_id: String(shipment.shipment_type.shipment_type_id),
        });
    };
    const closeEditModal = () => setEditingShipment(null);
    const handleEditSubmit = () => {
        if (!editingShipment) return;
        router.put(`/shipments/${editingShipment.shipment_id}`, editForm, { onSuccess: closeEditModal });
    };

    const handleStatusUpdate = (shipmentDocId: number, statusId: number) => {
        router.post(`/shipments/documents/${shipmentDocId}/status`, { status_id: statusId }, { preserveScroll: true });
    };

    const closePanel = () => {
        setActiveDocPanel(null);
        setSelectedDocId(null);
    };

    return (
        <>
            <Head title="Shipments" />
            <div className="flex min-h-screen flex-col bg-[#F9FAFB] dark:bg-[#030712] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-slate-400" />
                        <h1 className="text-2xl font-black tracking-tighter">Shipment Details</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-2"><Eye className="size-3.5" /> View All</Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-2"><Calendar className="size-3.5" /> Last 30 Days</Button> */}
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-2"><Download className="size-3.5" /> Export</Button>
                        {hasPermission('add_shipments') && (
                            <button onClick={openAddModal} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
                                <Plus className="h-4 w-4" /> Add Shipment
                            </button>
                        )}
                    </div>
                </div>

                <ShipmentsTable
                    shipments={shipments}
                    filteredShipments={filteredShipments}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    openEditModal={openEditModal}
                    setArchivingShipment={setArchivingShipment}
                    setActiveDocPanel={setActiveDocPanel}
                    setSelectedDocId={setSelectedDocId}
                />
            </div>

            {/* Modals (Add, Edit, Archive) */}
            {showAddModal && (
                <ModalShell title="Add Shipment" onClose={closeAddModal} onSubmit={handleAddSubmit} submitLabel="Create Shipment">
                    <ShipmentFormFields form={addForm} setForm={setAddForm} shipmentTypes={shipmentTypes} />
                </ModalShell>
            )}
            {editingShipment && (
                <ModalShell title="Edit Shipment" subtitle={editingShipment.shipment_reference} onClose={closeEditModal} onSubmit={handleEditSubmit} submitLabel="Save Changes">
                    <ShipmentFormFields form={editForm} setForm={setEditForm} shipmentTypes={shipmentTypes} />
                </ModalShell>
            )}
            {archivingShipment && (
                <ModalShell title="Archive Shipment" subtitle={`Confirm archive for ${archivingShipment.shipment_reference}`} onClose={() => setArchivingShipment(null)} onSubmit={() => router.patch(`/shipments/${archivingShipment.shipment_id}/archive`, undefined, { onSuccess: () => setArchivingShipment(null) })} submitLabel="Archive">
                    <div className="px-5 py-4 text-sm text-slate-600">Are you sure you want to archive this shipment? This action can be reverted later.</div>
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

Shipments.layout = (page: ReactNode) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
