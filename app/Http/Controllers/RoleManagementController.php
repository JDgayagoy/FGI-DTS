<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class RoleManagementController extends Controller
{
    public function index()
    {
        Gate::authorize('manage-roles');

        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function updatePermissions(Request $request, Role $role)
    {
        Gate::authorize('manage-roles');

        $validated = $request->validate([
            'permission_ids' => 'array',
            'permission_ids.*' => 'exists:permissions,permission_id',
        ]);

        // capture previous permission names for a readable audit trail
        $oldPermissionNames = $role->permissions()->pluck('name')->toArray();

        $role->permissions()->sync($validated['permission_ids'] ?? []);

        // resolve new permission names
        $newPermissionNames = Permission::whereIn('permission_id', $validated['permission_ids'] ?? [])->pluck('name')->toArray();

        ActivityLogger::log(
            'permissions_updated',
            "Updated permissions for role \"{$role->role_name}\".",
            $role,
            [
                'permission_ids' => $validated['permission_ids'] ?? [],
                'old_permission_names' => $oldPermissionNames,
                'new_permission_names' => $newPermissionNames,
                'from' => implode(', ', $oldPermissionNames),
                'to' => implode(', ', $newPermissionNames),
            ],
        );

        return redirect()->back()->with('success', 'Role permissions updated successfully.');
    }
}
