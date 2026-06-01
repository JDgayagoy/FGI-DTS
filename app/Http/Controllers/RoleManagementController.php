<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class RoleManagementController extends Controller
{
    public function index()
    {
        Gate::authorize('manage-rbac');

        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function updatePermissions(Request $request, Role $role)
    {
        Gate::authorize('manage-rbac');

        $validated = $request->validate([
            'permission_ids' => 'array',
            'permission_ids.*' => 'exists:permissions,permission_id',
        ]);

        $role->permissions()->sync($validated['permission_ids']);

        return redirect()->back()->with('success', 'Role permissions updated successfully.');
    }
}
