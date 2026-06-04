<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Permissions
        $permissions = [
            // Shipments
            ['name' => 'view_all_shipments', 'resource' => 'shipments', 'action' => 'view'],
            ['name' => 'add_shipments', 'resource' => 'shipments', 'action' => 'add'],
            ['name' => 'edit_shipments', 'resource' => 'shipments', 'action' => 'edit'],
            ['name' => 'delete_shipments', 'resource' => 'shipments', 'action' => 'delete'],
            // RBAC
            ['name' => 'manage_users', 'resource' => 'rbac', 'action' => 'manage_users'],
            ['name' => 'manage_roles', 'resource' => 'rbac', 'action' => 'manage_roles'],
            // Brokers
            ['name' => 'view_all_brokers', 'resource' => 'brokers', 'action' => 'view'],
            ['name' => 'add_brokers', 'resource' => 'brokers', 'action' => 'add'],
            ['name' => 'edit_brokers', 'resource' => 'brokers', 'action' => 'edit'],
            ['name' => 'delete_brokers', 'resource' => 'brokers', 'action' => 'delete'],
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
        // Super Admin: User and Role management only
        $superAdminPermissionIds = Permission::whereIn('name', [
            'manage_users',
            'manage_roles'
        ])->pluck('permission_id')->toArray();
        $superAdmin->permissions()->sync($superAdminPermissionIds);

        // Supply Chain Manager: All permissions except RBAC (manage users/roles)
        $scmPermissionIds = Permission::whereIn('name', [
            'view_all_shipments',
            'add_shipments',
            'edit_shipments',
            'delete_shipments',
            'view_all_brokers',
            'add_brokers',
            'edit_brokers',
            'delete_brokers'
        ])->pluck('permission_id')->toArray();
        $supplyChainManager->permissions()->sync($scmPermissionIds);

        // Logis Assoc: All shipment permissions + view brokers
        $shipmentPermissionIds = Permission::whereIn('name', [
            'view_all_shipments',
            'add_shipments',
            'edit_shipments',
            'delete_shipments',
            'view_all_brokers'
        ])->pluck('permission_id')->toArray();
        $logisAssoc->permissions()->sync($shipmentPermissionIds);

        // Brand Manager: add, view, edit shipments (no delete) + view brokers
        $brandPermissionIds = Permission::whereIn('name', [
            'view_all_shipments',
            'add_shipments',
            'edit_shipments',
            'view_all_brokers'
        ])->pluck('permission_id')->toArray();
        $brandManager->permissions()->sync($brandPermissionIds);
    }
}
