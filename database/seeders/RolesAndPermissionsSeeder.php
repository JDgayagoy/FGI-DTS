<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
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
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm['name']], $perm);
        }

        // 2. Create Roles
        $logisAssoc = Role::firstOrCreate(['role_name' => 'Logis Assoc']);
        $brandManager = Role::firstOrCreate(['role_name' => 'Brand manager']);
        $supplyChainManager = Role::firstOrCreate(['role_name' => 'Supply chain manager']);

        // 3. Assign Permissions to Roles
        // Supply Chain Manager: All permissions
        $allPermissionIds = Permission::pluck('permission_id')->toArray();
        $supplyChainManager->permissions()->sync($allPermissionIds);

        // Logis Assoc: All shipment permissions
        $shipmentPermissionIds = Permission::where('resource', 'shipments')->pluck('permission_id')->toArray();
        $logisAssoc->permissions()->sync($shipmentPermissionIds);

        // Brand Manager: add, view, edit shipments (no delete)
        $brandPermissionIds = Permission::whereIn('name', ['view_all_shipments', 'add_shipments', 'edit_shipments'])->pluck('permission_id')->toArray();
        $brandManager->permissions()->sync($brandPermissionIds);

    }
}
