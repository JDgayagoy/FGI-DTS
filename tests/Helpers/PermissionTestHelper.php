<?php

namespace Tests\Helpers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

class PermissionTestHelper
{
    /**
     * Create a user with a specific permission
     */
    public static function createUserWithPermission(string $action, string $resource): User
    {
        $user = User::factory()->create();
        $permission = Permission::where('action', $action)
            ->where('resource', $resource)
            ->firstOrFail();

        $role = Role::factory()->create();
        $role->permissions()->attach($permission);
        $user->roles()->attach($role);

        return $user->load('roles.permissions');
    }

    /**
     * Create a user with multiple permissions
     */
    public static function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $role = Role::factory()->create();

        $permissionIds = [];
        foreach ($permissions as [$action, $resource]) {
            $permission = Permission::where('action', $action)
                ->where('resource', $resource)
                ->firstOrFail();
            $permissionIds[] = $permission->permission_id;
        }

        $role->permissions()->attach($permissionIds);
        $user->roles()->attach($role);

        return $user->load('roles.permissions');
    }

    /**
     * Create a user with a specific role
     */
    public static function createUserWithRole(string $roleName): User
    {
        $user = User::factory()->create();
        $role = Role::where('role_name', $roleName)->firstOrFail();
        $user->roles()->attach($role);

        return $user->load('roles.permissions');
    }

    /**
     * Create a Super Admin user
     */
    public static function createSuperAdmin(): User
    {
        return self::createUserWithRole('Super Admin');
    }

    /**
     * Create a Supply Chain Manager user
     */
    public static function createSupplyChainManager(): User
    {
        return self::createUserWithRole('Supply chain manager');
    }

    /**
     * Create a Logis Associate user
     */
    public static function createLogisAssociate(): User
    {
        return self::createUserWithRole('Logis Assoc');
    }

    /**
     * Create a Brand Manager user
     */
    public static function createBrandManager(): User
    {
        return self::createUserWithRole('Brand manager');
    }

    /**
     * Create a user without any permissions
     */
    public static function createUserWithoutPermissions(): User
    {
        return User::factory()->create();
    }

    /**
     * Assign permission to user
     */
    public static function grantPermissionToUser(User $user, string $action, string $resource): void
    {
        $permission = Permission::where('action', $action)
            ->where('resource', $resource)
            ->firstOrFail();

        $user->roles()->first()?->permissions()->syncWithoutDetaching([$permission->permission_id]);
    }

    /**
     * Remove permission from user
     */
    public static function removePermissionFromUser(User $user, string $action, string $resource): void
    {
        $permission = Permission::where('action', $action)
            ->where('resource', $resource)
            ->firstOrFail();

        $user->roles()->first()?->permissions()->detach($permission->permission_id);
    }

    /**
     * Get all available permissions
     */
    public static function getAllPermissions(): array
    {
        return Permission::all()
            ->map(fn (Permission $p) => [
                'action' => $p->action,
                'resource' => $p->resource,
                'name' => $p->name,
            ])
            ->toArray();
    }

    /**
     * Get all available roles
     */
    public static function getAllRoles(): array
    {
        return Role::all()->pluck('role_name')->toArray();
    }

    /**
     * Assert user has permission
     */
    public static function assertUserHasPermission(User $user, string $action, string $resource): void
    {
        $user->refresh()->load('roles.permissions');

        if (! $user->hasPermission($action, $resource)) {
            throw new \Exception("Expected user {$user->id} to have permission: {$action} on {$resource}");
        }
    }

    /**
     * Assert user does not have permission
     */
    public static function assertUserDoesNotHavePermission(User $user, string $action, string $resource): void
    {
        $user->refresh()->load('roles.permissions');

        if ($user->hasPermission($action, $resource)) {
            throw new \Exception("Expected user {$user->id} to NOT have permission: {$action} on {$resource}");
        }
    }

    /**
     * Clear all user permissions
     */
    public static function clearUserPermissions(User $user): void
    {
        $user->roles()->detach();
    }
}
