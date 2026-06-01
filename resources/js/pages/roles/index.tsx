import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Shield, ShieldAlert, ShieldCheck, Key as KeyIcon, Edit2, Check } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModalShell } from '@/components/shipments/modal-shell';

interface Permission {
    permission_id: number;
    name: string;
    resource: string;
    action: string;
}

interface Role {
    role_id: number;
    role_name: string;
    permissions: Permission[];
}

interface Props {
    roles: Role[];
    permissions: Permission[];
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Role Management', href: '/roles' },
];

export default function Roles({ roles, permissions }: Props) {
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setSelectedPermissionIds(role.permissions.map((p) => p.permission_id));
    };

    const closeEditModal = () => {
        setEditingRole(null);
        setSelectedPermissionIds([]);
    };

    const togglePermission = (permissionId: number) => {
        setSelectedPermissionIds((prev) =>
            prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
        );
    };

    const handleSubmit = () => {
        if (!editingRole) return;
        router.put(`/roles/${editingRole.role_id}/permissions`, { permission_ids: selectedPermissionIds }, {
            onSuccess: closeEditModal,
            preserveScroll: true,
        });
    };

    // Group permissions by resource for the modal
    const permissionsByResource = permissions.reduce((acc, curr) => {
        if (!acc[curr.resource]) {
            acc[curr.resource] = [];
        }
        acc[curr.resource].push(curr);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <>
            <Head title="Role Management" />
            <div className="flex min-h-screen flex-col bg-[#F9FAFB] p-6 dark:bg-[#030712]">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-slate-400" />
                        <h1 className="text-2xl font-black tracking-tighter">Role Management</h1>
                    </div>
                </div>

                <div className="flex flex-col mb-8 rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/30 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 w-1/4">Role Name</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Permissions</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {roles.map((role) => (
                                    <tr key={role.role_id} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/40 dark:hover:bg-slate-800/10">
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                                            {role.role_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {role.permissions.length > 0 ? (
                                                    role.permissions.map((p) => (
                                                        <span key={p.permission_id} className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                            <KeyIcon className="size-3" /> {p.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        <ShieldAlert className="size-3" /> No Permissions
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditModal(role)}
                                                className="h-8 gap-1.5 text-xs font-bold text-slate-600 hover:text-purple-600"
                                            >
                                                <Edit2 className="size-3" /> Edit Permissions
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editingRole && (
                <ModalShell
                    title="Manage Permissions"
                    subtitle={`Grant or revoke capabilities for ${editingRole.role_name}`}
                    onClose={closeEditModal}
                    onSubmit={handleSubmit}
                    submitLabel="Save Permissions"
                >
                    <div className="p-6 space-y-6">
                        {Object.entries(permissionsByResource).map(([resource, resourcePerms]) => (
                            <div key={resource} className="space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 dark:border-slate-800">
                                    {resource}
                                </h3>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {resourcePerms.map((permission) => {
                                        const isSelected = selectedPermissionIds.includes(permission.permission_id);
                                        return (
                                            <div
                                                key={permission.permission_id}
                                                onClick={() => togglePermission(permission.permission_id)}
                                                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-all ${
                                                    isSelected
                                                        ? 'border-purple-600 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-900/20'
                                                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`font-bold text-sm ${isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {permission.name}
                                                    </div>
                                                </div>
                                                <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-700'}`}>
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalShell>
            )}
        </>
    );
}

Roles.layout = (page: ReactNode) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
