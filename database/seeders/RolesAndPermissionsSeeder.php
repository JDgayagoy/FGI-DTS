<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Permissions (using kebab-case names + action/resource columns)
        $permissions = [
            // Shipments
            ['name' => 'view-shipments', 'resource' => 'shipments', 'action' => 'view'],
            ['name' => 'add-shipments', 'resource' => 'shipments', 'action' => 'add'],
            ['name' => 'edit-shipments', 'resource' => 'shipments', 'action' => 'edit'],
            ['name' => 'archive-shipments', 'resource' => 'shipments', 'action' => 'archive'],
            // RBAC
            ['name' => 'manage-rbac', 'resource' => 'rbac', 'action' => 'manage_roles'],
            ['name' => 'create-user', 'resource' => 'rbac', 'action' => 'manage_users'],
            // Brokers
            ['name' => 'view-brokers', 'resource' => 'brokers', 'action' => 'view'],
            ['name' => 'add-brokers', 'resource' => 'brokers', 'action' => 'add'],
            ['name' => 'edit-brokers', 'resource' => 'brokers', 'action' => 'edit'],
            ['name' => 'delete-brokers', 'resource' => 'brokers', 'action' => 'delete'],
            // Logs
            ['name' => 'view-logs', 'resource' => 'logs', 'action' => 'view'],
            // Documents
            ['name' => 'upload-documents', 'resource' => 'documents', 'action' => 'upload'],
            ['name' => 'approve-documents', 'resource' => 'documents', 'action' => 'approve'],
            ['name' => 'reject-documents', 'resource' => 'documents', 'action' => 'reject'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm['name']], $perm);
        }

        // 2. Create Roles
        $superAdmin = Role::firstOrCreate(['role_name' => 'Super Admin']);
        $logisAssoc = Role::firstOrCreate(['role_name' => 'Logis Assoc']);
        $brandManager = Role::firstOrCreate(['role_name' => 'Brand manager']);
        $supplyChainManager = Role::firstOrCreate(['role_name' => 'Supply chain manager']);

        // 3. Assign Permissions to Roles
        // Super Admin: ALL permissions (complete access)
        $allPermissionIds = Permission::pluck('permission_id')->toArray();
        $superAdmin->permissions()->sync($allPermissionIds);

        // Supply Chain Manager: All permissions except RBAC
        $scmPermissionIds = Permission::whereIn('name', [
            'view-shipments',
            'add-shipments',
            'edit-shipments',
            'archive-shipments',
            'view-brokers',
            'add-brokers',
            'edit-brokers',
            'delete-brokers',
            'view-logs',
        ])->pluck('permission_id')->toArray();
        $supplyChainManager->permissions()->sync($scmPermissionIds);

        // Logis Assoc: All shipment permissions + view brokers
        $logisAssocPermissionIds = Permission::whereIn('name', [
            'view-shipments',
            'add-shipments',
            'edit-shipments',
            'archive-shipments',
            'view-brokers',
        ])->pluck('permission_id')->toArray();
        $logisAssoc->permissions()->sync($logisAssocPermissionIds);

        // Brand Manager: add, view, edit shipments (no delete) + view brokers
        $brandManagerPermissionIds = Permission::whereIn('name', [
            'view-shipments',
            'add-shipments',
            'edit-shipments',
            'view-brokers',
        ])->pluck('permission_id')->toArray();
        $brandManager->permissions()->sync($brandManagerPermissionIds);
    }
}
