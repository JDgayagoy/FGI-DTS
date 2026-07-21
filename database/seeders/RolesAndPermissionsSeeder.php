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
            ['name' => 'manage-roles', 'resource' => 'rbac', 'action' => 'manage_roles'],
            ['name' => 'manage-users', 'resource' => 'rbac', 'action' => 'manage_users'],
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
<<<<<<< HEAD
        // Super Admin: ALL permissions (complete access)
        $allPermissionIds = Permission::pluck('permission_id')->toArray();
        $superAdmin->permissions()->sync($allPermissionIds);
=======
        // Super Admin: User and Role management only
        $superAdminPermissionIds = Permission::whereIn('name', [
            'manage_users',
            'manage_roles',
        ])->pluck('permission_id')->toArray();
        $superAdmin->permissions()->sync($superAdminPermissionIds);
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e

        // Supply Chain Manager: All permissions except RBAC
        $scmPermissionIds = Permission::whereIn('name', [
<<<<<<< HEAD
            'view-shipments',
            'add-shipments',
            'edit-shipments',
            'archive-shipments',
            'view-brokers',
            'add-brokers',
            'edit-brokers',
            'delete-brokers',
            'view-logs',
=======
            'view_all_shipments',
            'add_shipments',
            'edit_shipments',
            'delete_shipments',
            'view_all_brokers',
            'add_brokers',
            'edit_brokers',
            'delete_brokers',
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
        ])->pluck('permission_id')->toArray();
        $supplyChainManager->permissions()->sync($scmPermissionIds);

        // Logis Assoc: All shipment permissions + view brokers
<<<<<<< HEAD
        $logisAssocPermissionIds = Permission::whereIn('name', [
            'view-shipments',
            'add-shipments',
            'edit-shipments',
            'archive-shipments',
            'view-brokers',
=======
        $shipmentPermissionIds = Permission::whereIn('name', [
            'view_all_shipments',
            'add_shipments',
            'edit_shipments',
            'delete_shipments',
            'view_all_brokers',
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
        ])->pluck('permission_id')->toArray();
        $logisAssoc->permissions()->sync($logisAssocPermissionIds);

        // Brand Manager: add, view, edit shipments (no delete) + view brokers
<<<<<<< HEAD
        $brandManagerPermissionIds = Permission::whereIn('name', [
            'view-shipments',
            'add-shipments',
            'edit-shipments',
            'view-brokers',
=======
        $brandPermissionIds = Permission::whereIn('name', [
            'view_all_shipments',
            'add_shipments',
            'edit_shipments',
            'view_all_brokers',
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
        ])->pluck('permission_id')->toArray();
        $brandManager->permissions()->sync($brandManagerPermissionIds);
    }
}
