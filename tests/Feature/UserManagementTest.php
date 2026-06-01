<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Ensure permissions and roles exist
    $this->manageUsersPermission = Permission::firstOrCreate(
        ['name' => 'manage_users'],
        ['resource' => 'rbac', 'action' => 'manage_users']
    );

    $this->scmRole = Role::firstOrCreate(['role_name' => 'Supply chain manager']);
    $this->scmRole->permissions()->syncWithoutDetaching([$this->manageUsersPermission->permission_id]);

    $this->otherRole = Role::firstOrCreate(['role_name' => 'Logis Assoc']);
});

it('allows supply chain manager to create a user', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'role_ids' => [$this->otherRole->role_id],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('users', [
        'email' => 'newuser@example.com',
        'name' => 'New User',
    ]);

    $newUser = User::where('email', 'newuser@example.com')->first();
    expect($newUser->roles)->toHaveCount(1);
    expect($newUser->roles->first()->role_name)->toBe('Logis Assoc');
});

it('denies other roles from creating a user', function () {
    $nonAdmin = User::factory()->create();
    $nonAdmin->roles()->attach($this->otherRole);

    actingAs($nonAdmin)
        ->post(route('users.store'), [
            'name' => 'Should Fail',
            'email' => 'fail@example.com',
            'password' => 'Password123!',
            'role_ids' => [$this->otherRole->role_id],
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('users', [
        'email' => 'fail@example.com',
    ]);
});

it('validates user creation input', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->post(route('users.store'), [
            'name' => '',
            'email' => 'invalid-email',
            'password' => 'short',
            'role_ids' => [],
        ])
        ->assertSessionHasErrors(['name', 'email', 'password', 'role_ids']);
});
