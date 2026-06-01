<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    public function index()
    {
        Gate::authorize('manage-rbac');

        $users = User::with('roles')->get();
        $roles = Role::all();

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('create-user');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'string', Password::defaults()],
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,role_id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->roles()->sync($validated['role_ids']);

        return redirect()->back()->with('success', 'User created successfully.');
    }

    public function updateRoles(Request $request, User $user)
    {
        Gate::authorize('manage-rbac');

        $validated = $request->validate([
            'role_ids' => 'array',
            'role_ids.*' => 'exists:roles,role_id',
        ]);

        $user->roles()->sync($validated['role_ids']);

        return redirect()->back()->with('success', 'User roles updated successfully.');
    }
}
