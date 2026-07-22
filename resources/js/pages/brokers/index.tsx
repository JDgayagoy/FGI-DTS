import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Truck, Plus, Edit2, Trash2, CheckCircle, XCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type {ReactNode} from 'react';
import { ModalShell } from '@/components/shipments/modal-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

interface Broker {
    broker_id: number;
    broker_name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    is_active: boolean;
    version: number;
}

interface Props {
    brokers: Broker[];
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Broker Management', href: '/brokers' },
];

const emptyBrokerForm = {
    broker_name: '',
    contact_person: '',
    email: '',
    phone: '',
    is_active: true as boolean,
    version: 0,
};

export default function Brokers({ brokers }: Props) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
    const [deletingBroker, setDeletingBroker] = useState<Broker | null>(null);
    const { data: form, setData: setForm, post: postBroker, processing: creatingBroker, errors: createErrors, clearErrors: clearCreateErrors, reset: resetCreate } = useForm({ ...emptyBrokerForm });
    const { data: editForm, setData: setEditForm, patch: patchBroker, processing: updatingBroker, errors: editErrors, clearErrors: clearEditErrors, reset: resetEdit } = useForm({ ...emptyBrokerForm });

    const openCreateModal = () => {
        resetCreate();
        setForm({ ...emptyBrokerForm });
        clearCreateErrors();
        setIsCreating(true);
    };

    const openEditModal = (broker: Broker) => {
        setEditingBroker(broker);
        resetEdit();
        setEditForm({
            broker_name: broker.broker_name,
            contact_person: broker.contact_person ?? '',
            email: broker.email ?? '',
            phone: broker.phone ?? '',
            is_active: broker.is_active,
            version: broker.version,
        });
        clearEditErrors();
    };

    const handleCreate = () => {
        postBroker('/brokers', {
            onSuccess: () => {
                setIsCreating(false);
                resetCreate();
            },
        });
    };

    const handleUpdate = () => {
        if (!editingBroker) {
            return;
        }

        patchBroker(`/brokers/${editingBroker.broker_id}`, {
            onSuccess: () => setEditingBroker(null),
        });
    };

    const handleDelete = () => {
        if (!deletingBroker) {
return;
}

        router.delete(`/brokers/${deletingBroker.broker_id}`, {
            onSuccess: () => setDeletingBroker(null),
        });
    };

    const { flash } = usePage<{ flash: { stale_error?: string | null } }>().props;

    useEffect(() => {
        if (flash?.stale_error) {
            toast.error("Couldn't save changes", {
                description: flash.stale_error,
                duration: 5000,
                position: 'top-center',
                classNames: {
                    toast: 'bg-destructive dark:bg-destructive/60 border-none text-white shadow-lg',
                    title: 'text-white font-bold',
                    description: 'text-white/80',
                    icon: 'text-white',
                },
            });
        }
    }, [flash?.stale_error]);

    return (
        <>
            <Head title="Broker Management" />
            <div className="flex min-h-screen flex-col bg-[#F9FAFB] p-6 dark:bg-[#030712]">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Truck className="h-6 w-6 text-slate-400" />
                        <h1 className="text-2xl font-black tracking-tighter">Broker Management</h1>
                    </div>
                    <Button onClick={openCreateModal} className="gap-2 bg-blue-600 hover:bg-blue-700 font-bold">
                        <Plus className="size-4" /> Add Broker
                    </Button>
                </div>

                {/* Table */}
                <div className="flex flex-col mb-8 rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/30 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Broker Name</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact Person</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {brokers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                                            No brokers found. Add one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    brokers.map((broker) => (
                                        <tr key={broker.broker_id} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/40 dark:hover:bg-slate-800/10">
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                                                {broker.broker_name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {broker.contact_person ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {broker.email ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {broker.phone ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {broker.is_active ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                        <CheckCircle className="size-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        <XCircle className="size-3" /> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditModal(broker)}
                                                        className="h-8 gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600"
                                                    >
                                                        <Edit2 className="size-3" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDeletingBroker(broker)}
                                                        className="h-8 gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:border-red-300"
                                                    >
                                                        <Trash2 className="size-3" /> Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/30 dark:bg-slate-900/20 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Total Brokers: <span className="text-slate-900 dark:text-white">{brokers.length}</span></span>
                        <span>Active: <span className="text-green-600">{brokers.filter(b => b.is_active).length}</span></span>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {isCreating && (
                <ModalShell
                    title="Add New Broker"
                    subtitle="Fill in the details to register a new broker"
                    onClose={() => setIsCreating(false)}
                    onSubmit={handleCreate}
                    submitLabel="Create Broker"
                    loading={creatingBroker}
                >
                    <BrokerFormFields form={form} setForm={setForm} errors={createErrors} />
                </ModalShell>
            )}

            {/* Edit Modal */}
            {editingBroker && (
                <ModalShell
                    title="Edit Broker"
                    subtitle={editingBroker.broker_name}
                    onClose={() => setEditingBroker(null)}
                    onSubmit={handleUpdate}
                    submitLabel="Save Changes"
                    loading={updatingBroker}
                >
                    <BrokerFormFields form={editForm} setForm={setEditForm} errors={editErrors} />
                </ModalShell>
            )}

            {/* Delete Confirmation Modal */}
            {deletingBroker && (
                <ModalShell
                    title="Delete Broker"
                    subtitle={`Are you sure you want to delete "${deletingBroker.broker_name}"?`}
                    onClose={() => setDeletingBroker(null)}
                    onSubmit={handleDelete}
                    submitLabel="Delete"
                >
                    <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {deletingBroker.broker_name} will be <strong>deactivated</strong> if it has associated shipments, or permanently deleted if it has none.
                    </div>
                </ModalShell>
            )}
        </>
    );
}

function BrokerFormFields({
    form,
    setForm,
    errors,
}: {
    form: typeof emptyBrokerForm;
    setForm: (f: typeof emptyBrokerForm) => void;
    errors: Partial<typeof emptyBrokerForm>;
}) {
    return (
        <div className="grid grid-cols-2 gap-4 px-5 py-4">
            <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="broker_name">Broker Name <span className="text-red-500">*</span></Label>
                <Input
                    id="broker_name"
                    value={form.broker_name}
                    onChange={(e) => setForm({ ...form, broker_name: e.target.value })}
                    placeholder="e.g. Grab Philippines"
                    className={errors.broker_name ? 'border-red-500' : ''}
                />
                {errors.broker_name && <p className="text-xs text-red-500">{errors.broker_name}</p>}
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                    id="contact_person"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="e.g. Juan Dela Cruz"
                />
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 09171234567"
                />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. broker@example.com"
                />
            </div>
            <div className="col-span-2 flex items-center gap-3">
                <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <Label htmlFor="is_active" className="cursor-pointer">Active (shows in shipment dropdown)</Label>
            </div>
        </div>
    );
}

Brokers.layout = (page: ReactNode) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
