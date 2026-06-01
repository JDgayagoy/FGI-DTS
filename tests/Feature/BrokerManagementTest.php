<?php

use App\Models\Broker;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create broker permissions
    $this->manageUsersPermission = Permission::firstOrCreate(
        ['name' => 'manage_users'],
        ['resource' => 'rbac', 'action' => 'manage_users']
    );

    $this->addBrokersPermission = Permission::firstOrCreate(
        ['name' => 'add_brokers'],
        ['resource' => 'brokers', 'action' => 'add']
    );

    $this->viewBrokersPermission = Permission::firstOrCreate(
        ['name' => 'view_all_brokers'],
        ['resource' => 'brokers', 'action' => 'view']
    );

    // Supply chain manager gets all broker permissions
    $this->scmRole = Role::firstOrCreate(['role_name' => 'Supply chain manager']);
    $this->scmRole->permissions()->syncWithoutDetaching([
        $this->manageUsersPermission->permission_id,
        $this->addBrokersPermission->permission_id,
        $this->viewBrokersPermission->permission_id,
    ]);

    // Logis Assoc can only view
    $this->logisRole = Role::firstOrCreate(['role_name' => 'Logis Assoc']);
    $this->logisRole->permissions()->syncWithoutDetaching([
        $this->viewBrokersPermission->permission_id,
    ]);
});

// ── Index / View ──────────────────────────────────────────────────────────────

it('allows supply chain manager to view the broker management page', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->get(route('brokers.index'))
        ->assertSuccessful();
});

it('denies logis assoc from viewing the broker management page', function () {
    $user = User::factory()->create();
    $user->roles()->attach($this->logisRole);

    actingAs($user)
        ->get(route('brokers.index'))
        ->assertForbidden();
});

it('denies unauthenticated users from the broker management page', function () {
    $this->get(route('brokers.index'))
        ->assertRedirect(route('login'));
});

// ── Create ────────────────────────────────────────────────────────────────────

it('allows supply chain manager to create a broker', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->post(route('brokers.store'), [
            'broker_name' => 'FastShip Co.',
            'contact_person' => 'John Doe',
            'email' => 'john@fastship.com',
            'phone' => '09171234567',
            'is_active' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('brokers', [
        'broker_name' => 'FastShip Co.',
        'email' => 'john@fastship.com',
        'is_active' => true,
    ]);
});

it('denies logis assoc from creating a broker', function () {
    $user = User::factory()->create();
    $user->roles()->attach($this->logisRole);

    actingAs($user)
        ->post(route('brokers.store'), [
            'broker_name' => 'Unauthorized Broker',
            'is_active' => true,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('brokers', ['broker_name' => 'Unauthorized Broker']);
});

it('validates broker creation requires a broker name', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->post(route('brokers.store'), [
            'broker_name' => '',
            'is_active' => true,
        ])
        ->assertSessionHasErrors(['broker_name']);
});

it('validates broker name must be unique', function () {
    Broker::create(['broker_name' => 'Existing Broker', 'is_active' => true]);

    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->post(route('brokers.store'), [
            'broker_name' => 'Existing Broker',
            'is_active' => true,
        ])
        ->assertSessionHasErrors(['broker_name']);
});

// ── Update ────────────────────────────────────────────────────────────────────

it('allows supply chain manager to update a broker', function () {
    $broker = Broker::create(['broker_name' => 'Old Name', 'is_active' => true]);

    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->put(route('brokers.update', $broker->broker_id), [
            'broker_name' => 'New Name',
            'is_active' => false,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('brokers', [
        'broker_id' => $broker->broker_id,
        'broker_name' => 'New Name',
        'is_active' => false,
    ]);
});

it('denies logis assoc from updating a broker', function () {
    $broker = Broker::create(['broker_name' => 'Protected Broker', 'is_active' => true]);

    $user = User::factory()->create();
    $user->roles()->attach($this->logisRole);

    actingAs($user)
        ->put(route('brokers.update', $broker->broker_id), [
            'broker_name' => 'Hacked Name',
            'is_active' => true,
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('brokers', ['broker_name' => 'Protected Broker']);
});

// ── Delete ────────────────────────────────────────────────────────────────────

it('allows supply chain manager to delete a broker with no shipments', function () {
    $broker = Broker::create(['broker_name' => 'Deletable Broker', 'is_active' => true]);

    $admin = User::factory()->create();
    $admin->roles()->attach($this->scmRole);

    actingAs($admin)
        ->delete(route('brokers.destroy', $broker->broker_id))
        ->assertRedirect();

    $this->assertDatabaseMissing('brokers', ['broker_id' => $broker->broker_id]);
});

it('denies logis assoc from deleting a broker', function () {
    $broker = Broker::create(['broker_name' => 'Safe Broker', 'is_active' => true]);

    $user = User::factory()->create();
    $user->roles()->attach($this->logisRole);

    actingAs($user)
        ->delete(route('brokers.destroy', $broker->broker_id))
        ->assertForbidden();

    $this->assertDatabaseHas('brokers', ['broker_id' => $broker->broker_id]);
});
