<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
 // ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Create a user with a specific role.
 */
function createUserWithRole(string $roleName): User
{
    $user = User::factory()->create();
    $role = Role::firstOrCreate(
        ['role_name' => $roleName],
        ['role_name' => $roleName]
    );
    $user->roles()->attach($role);

    return $user;
}

/**
 * Create a user with a specific permission.
 *
 * Supports special gate-based permissions that may have different internal action names.
 * Examples:
 *   - createUserWithPermission('view', 'shipments') creates 'view-shipments' permission
 *   - createUserWithPermission('manage', 'rbac') creates 'manage-rbac' permission with action 'manage_roles'
 *   - createUserWithPermission('create', 'user') creates 'create-user' permission with action 'manage_users'
 *
 * @param  string  $action  Simplified action (e.g., 'view', 'add', 'edit', 'manage', 'create')
 * @param  string  $resource  Resource name (e.g., 'shipments', 'brokers', 'rbac')
 */
function createUserWithPermission(string $action, string $resource): User
{
    $user = User::factory()->create();

    // Map simplified actions to their actual database action names (matching AppServiceProvider gates)
    $actionMap = [
        'manage' => ['rbac' => 'manage_roles'],
        'create' => ['rbac' => 'manage_users'],
    ];

    // Determine actual action to store in database
    $actualAction = $actionMap[$action][$resource] ?? $action;

    // Build permission name from simplified action and resource
    // Format: action-resource (e.g., 'view-shipments', 'add-brokers', 'manage-rbac')
    $permissionName = "{$action}-{$resource}";

    $permission = Permission::firstOrCreate(
        ['name' => $permissionName],
        [
            'name' => $permissionName,
            'action' => $actualAction,
            'resource' => $resource,
        ]
    );

    // Create a temporary role and attach permission
    $role = Role::factory()->create();
    $role->permissions()->attach($permission);
    $user->roles()->attach($role);

    return $user;
}
