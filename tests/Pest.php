<?php

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
function createUserWithRole(string $roleName): \App\Models\User
{
    $user = \App\Models\User::factory()->create();
    $role = \App\Models\Role::firstOrCreate(
        ['role_name' => $roleName],
        ['role_name' => $roleName]
    );
    $user->roles()->attach($role);

    return $user;
}

/**
 * Create a user with a specific permission.
 *
 * @param  string  $action  Action name (e.g., 'view', 'add', 'edit')
 * @param  string  $resource  Resource name (e.g., 'shipments', 'brokers')
 */
function createUserWithPermission(string $action, string $resource): \App\Models\User
{
    $user = \App\Models\User::factory()->create();

    // Build permission name from action and resource
    // Format: action-resource (e.g., 'view-shipments', 'add-brokers')
    $permissionName = "{$action}-{$resource}";

    $permission = \App\Models\Permission::firstOrCreate(
        ['name' => $permissionName],
        [
            'name' => $permissionName,
            'action' => $action,
            'resource' => $resource,
        ]
    );

    // Create a temporary role and attach permission
    $role = \App\Models\Role::factory()->create();
    $role->permissions()->attach($permission);
    $user->roles()->attach($role);

    return $user;
}
