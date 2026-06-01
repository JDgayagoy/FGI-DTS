import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Shield, ShieldAlert, ShieldCheck, Users as UsersIcon, Edit2, Check, UserPlus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModalShell } from '@/components/shipments/modal-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Role {
    role_id: number;
    role_name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    roles: Role[];
}

interface Props {
    users: User[];
    roles: Role[];
    auth: {
        permissions: string[];
    };
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'User Management', href: '/users' },
];

export default function Users({ users, roles, auth }: Props) {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

    const canCreateUser = auth.permissions.includes('manage_users');

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        role_ids: [] as number[],
    });

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setSelectedRoleIds(user.roles.map((r) => r.role_id));
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setSelectedRoleIds([]);
        setIsUpdatingRoles(false);
    };

    const toggleRole = (roleId: number) => {
        setSelectedRoleIds((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
    };

    const handleUpdateRoles = () => {
        if (!editingUser) return;
        setIsUpdatingRoles(true);
        router.put(`/users/${editingUser.id}/roles`, { role_ids: selectedRoleIds }, {
            onSuccess: closeEditModal,
            onFinish: () => setIsUpdatingRoles(false),
            preserveScroll: true,
        });
    };

    const handleCreateUser = () => {
        post('/users', {
            onSuccess: () => {
                setIsCreating(false);
                reset();
            },
            preserveScroll: true,
        });
    };

    const toggleCreateRole = (roleId: number) => {
        const current = data.role_ids;
        if (current.includes(roleId)) {
            setData('role_ids', current.filter(id => id !== roleId));
        } else {
            setData('role_ids', [...current, roleId]);
        }
    };

    return (
        <>
            <Head title="User Management" />
            <div className="flex min-h-screen flex-col bg-[#F9FAFB] p-6 dark:bg-[#030712]">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UsersIcon className="h-6 w-6 text-slate-400" />
                        <h1 className="text-2xl font-black tracking-tighter">User Management</h1>
                    </div>
                    {canCreateUser && (
                        <Button onClick={() => setIsCreating(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 font-bold">
                            <UserPlus className="size-4" /> Add New User
                        </Button>
                    )}
                </div>

                <div className="flex flex-col mb-8 rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/30 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Roles</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {users.map((user) => (
                                    <tr key={user.id} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/40 dark:hover:bg-slate-800/10">
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {user.roles.length > 0 ? (
                                                    user.roles.map((r) => (
                                                        <span key={r.role_id} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            <ShieldCheck className="size-3" /> {r.role_name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        <ShieldAlert className="size-3" /> No Roles
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditModal(user)}
                                                className="h-8 gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600"
                                            >
                                                <Edit2 className="size-3" /> Edit Roles
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isCreating && (
                <ModalShell
                    title="Create New User"
                    subtitle="Fill in the details to add a new team member"
                    onClose={() => setIsCreating(false)}
                    onSubmit={handleCreateUser}
                    submitLabel="Create User"
                    loading={processing}
                >
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="john@example.com"
                                    className={errors.email ? 'border-red-500' : ''}
                                />
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    className={errors.password ? 'border-red-500' : ''}
                                />
                                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Assign Roles</Label>
                            <div className="grid gap-3">
                                {roles.map((role) => {
                                    const isSelected = data.role_ids.includes(role.role_id);
                                    return (
                                        <div
                                            key={role.role_id}
                                            onClick={() => toggleCreateRole(role.role_id)}
                                            className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                                                isSelected
                                                    ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20'
                                                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                    <Shield className="h-4 w-4" />
                                                </div>
                                                <div className={`text-sm font-bold ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {role.role_name}
                                                </div>
                                            </div>
                                            <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-700'}`}>
                                                <Check className="h-3 w-3" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {errors.role_ids && <p className="text-xs text-red-500">{errors.role_ids}</p>}
                        </div>
                    </div>
                </ModalShell>
            )}

            {editingUser && (
                <ModalShell
                    title="Manage User Roles"
                    subtitle={`Assign or remove roles for ${editingUser.name}`}
                    onClose={closeEditModal}
                    onSubmit={handleUpdateRoles}
                    submitLabel="Save Roles"
                    loading={isUpdatingRoles}
                >
                    <div className="p-6 space-y-4">
                        <div className="grid gap-4">
                            {roles.map((role) => {
                                const isSelected = selectedRoleIds.includes(role.role_id);
                                return (
                                    <div
                                        key={role.role_id}
                                        onClick={() => toggleRole(role.role_id)}
                                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className={`font-bold ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {role.role_name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Grant {role.role_name} capabilities
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-700'}`}>
                                            <Check className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </ModalShell>
            )}
        </>
    );
}

Users.layout = (page: ReactNode) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
