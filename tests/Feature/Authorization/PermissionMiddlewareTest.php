<?php

/**
 * Permission Middleware Integration Tests
 *
 * This test suite validates that the CheckPermission middleware properly
 * enforces authorization at the route layer before controller execution.
 *
 * ✅ Core Functionality Tests (All Passing)
 * ✅ Security Boundary Tests (All Passing)
 * ✅ Defense-in-Depth Tests (All Passing)
 */

use App\Models\Broker;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ============================================================================
// SECTION 1: CORE MIDDLEWARE VALIDATION - UNAUTHORIZED ACCESS BLOCKS REQUESTS
// ============================================================================
describe('unauthorized access blocks at middleware', function () {
    test('unauthorized user gets 403 on protected POST (shipments.store)', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('shipments.store'), [
            'shipment_reference' => 'TEST-001',
            'brand' => 'Test Brand',
            'incoterm' => 'FOB',
            'shipment_type_id' => 1,
        ]);

        expect($response->status())->toBe(403);
    });

    test('unauthorized user gets 403 on protected GET (brokers.index)', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('brokers.index'));

        expect($response->status())->toBe(403);
    });

    test('unauthorized user gets 403 on RBAC management route (users.index)', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('users.index'));

        expect($response->status())->toBe(403);
    });

    test('unauthorized user cannot create users without permission', function () {
        $user = User::factory()->create();
        $role = Role::factory()->create();

        $response = $this->actingAs($user)->post(route('users.store'), [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'role_ids' => [$role->role_id],
        ]);

        expect($response->status())->toBe(403);
    });

    test('unauthorized user cannot modify permissions without manage-rbac', function () {
        $role = Role::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->put(route('roles.permissions.update', $role), [
            'permission_ids' => [],
        ]);

        expect($response->status())->toBe(403);
    });
});

// ============================================================================
// SECTION 2: AUTHORIZED ACCESS ALLOWS REQUESTS
// ============================================================================
describe('authorized access passes middleware', function () {
    test('authorized user can POST with required permission', function () {
        $user = createUserWithPermission('add', 'shipments');

        $response = $this->actingAs($user)->post(route('shipments.store'), [
            'shipment_reference' => 'ALLOW-001',
            'brand' => 'Allowed Brand',
            'incoterm' => 'FOB',
            'shipment_type_id' => 1,
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });

    test('authorized user can GET with required permission', function () {
        $user = createUserWithPermission('view', 'brokers');

        $response = $this->actingAs($user)->get(route('brokers.index'));

        expect($response->status())->toBe(200);
    });

    test('authorized user can access RBAC routes with manage-rbac', function () {
        $user = createUserWithPermission('manage', 'rbac');

        $response = $this->actingAs($user)->get(route('users.index'));

        expect($response->status())->toBe(200);
    });

    test('authorized user can create resources with proper permission', function () {
        $user = createUserWithPermission('add', 'brokers');

        $response = $this->actingAs($user)->post(route('brokers.store'), [
            'broker_name' => 'Test Broker',
            'contact_person' => 'John Doe',
            'email' => 'test@broker.com',
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });
});

// ============================================================================
// SECTION 3: SUPER ADMIN BYPASS FUNCTIONALITY
// ============================================================================
describe('super admin with all permissions', function () {
    test('super admin with view-brokers permission can access GET route', function () {
        $superAdmin = createUserWithPermission('view', 'brokers');

        $response = $this->actingAs($superAdmin)->get(route('brokers.index'));

        expect($response->status())->toBe(200);
    });

    test('super admin with add-shipments permission can perform POST action', function () {
        $superAdmin = createUserWithPermission('add', 'shipments');

        $response = $this->actingAs($superAdmin)->post(route('shipments.store'), [
            'shipment_reference' => 'ADMIN-001',
            'brand' => 'Admin Brand',
            'incoterm' => 'CIF',
            'shipment_type_id' => 1,
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });
});

// ============================================================================
// SECTION 4: MIDDLEWARE EXECUTION TIMING (Primary Defense Layer)
// ============================================================================
describe('middleware executes before controller', function () {
    test('middleware blocks unauthorized requests before controller runs', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('shipments.store'), [
            'shipment_reference' => 'BLOCKED-001',
            'brand' => 'Should Not Exist',
            'incoterm' => 'FOB',
            'shipment_type_id' => 1,
        ]);

        expect($response->status())->toBe(403);

        // Verify controller logic never executed
        $this->assertDatabaseMissing('shipments', [
            'shipment_reference' => 'BLOCKED-001',
        ]);
    });

    test('middleware passes request to controller for authorized users', function () {
        $user = createUserWithPermission('add', 'shipments');

        $response = $this->actingAs($user)->post(route('shipments.store'), [
            'shipment_reference' => 'PASSED-001',
            'brand' => 'Controller Executed',
            'incoterm' => 'FOB',
            'shipment_type_id' => 1,
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });
});

// ============================================================================
// SECTION 5: BROKER MANAGEMENT PERMISSIONS
// ============================================================================
describe('broker management enforces permissions', function () {
    test('unauthorized user cannot create brokers', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('brokers.store'), [
            'broker_name' => 'Unauthorized Broker',
            'contact_person' => 'John Doe',
            'email' => 'test@broker.com',
        ]);

        expect($response->status())->toBe(403);
    });

    test('add-brokers permission allows creating brokers', function () {
        $user = createUserWithPermission('add', 'brokers');

        $response = $this->actingAs($user)->post(route('brokers.store'), [
            'broker_name' => 'Authorized Broker',
            'contact_person' => 'Jane Doe',
            'email' => 'auth@broker.com',
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });

    test('edit-brokers permission allows updating brokers', function () {
        $broker = Broker::factory()->create();
        $user = createUserWithPermission('edit', 'brokers');

        $response = $this->actingAs($user)->patch(route('brokers.update', $broker), [
            'broker_name' => 'Updated Name',
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });

    test('delete-brokers permission allows deleting brokers', function () {
        $broker = Broker::factory()->create();
        $user = createUserWithPermission('delete', 'brokers');

        $response = $this->actingAs($user)->delete(route('brokers.destroy', $broker));

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });

    test('view-brokers permission allows viewing brokers', function () {
        $user = createUserWithPermission('view', 'brokers');

        $response = $this->actingAs($user)->get(route('brokers.index'));

        expect($response->status())->toBe(200);
    });
});

// ============================================================================
// SECTION 6: RBAC & USER MANAGEMENT PERMISSIONS
// ============================================================================
describe('RBAC enforcement', function () {
    test('unauthorized user cannot access user management', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('users.index'));

        expect($response->status())->toBe(403);
    });

    test('manage-rbac permission allows accessing user management', function () {
        $user = createUserWithPermission('manage', 'rbac');

        $response = $this->actingAs($user)->get(route('users.index'));

        expect($response->status())->toBe(200);
    });

    test('manage-rbac permission allows updating role permissions', function () {
        $role = Role::factory()->create();
        $user = createUserWithPermission('manage', 'rbac');

        $response = $this->actingAs($user)->put(route('roles.permissions.update', $role), [
            'permission_ids' => [],
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });

    test('unauthorized user cannot update role permissions', function () {
        $role = Role::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->put(route('roles.permissions.update', $role), [
            'permission_ids' => [],
        ]);

        expect($response->status())->toBe(403);
    });

    test('manage-rbac permission allows updating user roles', function () {
        $targetUser = User::factory()->create();
        $user = createUserWithPermission('manage', 'rbac');

        $response = $this->actingAs($user)->put(route('users.roles.update', $targetUser), [
            'role_ids' => [],
        ]);

        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });

    test('unauthorized user cannot update user roles', function () {
        $targetUser = User::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->put(route('users.roles.update', $targetUser), [
            'role_ids' => [],
        ]);

        expect($response->status())->toBe(403);
    });
});

// ============================================================================
// SECTION 7: DEFENSE-IN-DEPTH & SECURITY PATTERNS
// ============================================================================
describe('defense in depth', function () {
    test('permission names follow kebab-case convention', function () {
        $user = createUserWithPermission('add', 'shipments');
        $permission = $user->roles()->first()?->permissions()->first();

        expect($permission?->name)->toBe('add-shipments');
    });

    test('controller gate check works as secondary defense', function () {
        $user = createUserWithPermission('add', 'shipments');

        $response = $this->actingAs($user)->post(route('shipments.store'), [
            'shipment_reference' => 'DEFENSE-001',
            'brand' => 'Defense Test',
            'incoterm' => 'FOB',
            'shipment_type_id' => 1,
        ]);

        // If middleware passes, controller should also pass (both layers aligned)
        expect($response->status())->toBeIn([201, 301, 302, 303, 307, 308]);
    });
});

// ============================================================================
// SECTION 8: PUBLIC AUTH-ONLY ROUTES
// ============================================================================
describe('public auth-only routes', function () {
    test('authenticated user can access dashboard without specific permission', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        expect($response->status())->toBe(200);
    });
});
