<?php

use App\Models\Broker;
use App\Models\Role;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

// ============================================================================
// UNAUTHORIZED ACCESS TESTS
// ============================================================================

test('unauthorized user gets 403 on protected post route', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-001',
        'brand' => 'Test Brand',
        'incoterm' => 'FOB',
        'shipment_type_id' => 1,
    ]);

    $response->assertStatus(403);
});

test('unauthorized user gets 403 on protected get route', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('brokers.index'));

    $response->assertStatus(403);
});

test('unauthorized user gets 403 on protected patch route', function () {
    $shipment = Shipment::factory()->create();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->patch(route('shipments.update', $shipment), [
        'shipment_reference' => 'UPDATED',
    ]);

    $response->assertStatus(403);
});

test('unauthorized user gets 403 on protected delete route', function () {
    $broker = Broker::factory()->create();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->delete(route('brokers.destroy', $broker));

    $response->assertStatus(403);
});

// ============================================================================
// AUTHORIZED ACCESS TESTS
// ============================================================================

test('authorized user can access protected post route', function () {
    $user = createUserWithPermission('add', 'shipments');

    $response = $this->actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-001',
        'brand' => 'Test Brand',
        'incoterm' => 'FOB',
        'shipment_type_id' => 1,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('shipments', ['shipment_reference' => 'TEST-001']);
});

test('authorized user can access protected get route', function () {
    $user = createUserWithPermission('view', 'brokers');

    $response = $this->actingAs($user)->get(route('brokers.index'));

    $response->assertOk();
});

test('authorized user can access protected patch route', function () {
    $shipment = Shipment::factory()->create();
    $user = createUserWithPermission('edit', 'shipments');

    $response = $this->actingAs($user)->patch(route('shipments.update', $shipment), [
        'shipment_reference' => 'UPDATED-001',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('shipments', ['shipment_reference' => 'UPDATED-001']);
});

test('authorized user can access protected delete route', function () {
    $broker = Broker::factory()->create();
    $user = createUserWithPermission('delete', 'brokers');

    $response = $this->actingAs($user)->delete(route('brokers.destroy', $broker));

    $response->assertRedirect();
});

// ============================================================================
// SUPER ADMIN BYPASS TESTS
// ============================================================================

test('super admin bypasses all permission checks', function () {
    $superAdmin = createUserWithRole('Super Admin');

    $response = $this->actingAs($superAdmin)->get(route('brokers.index'));

    $response->assertOk();
});

test('super admin can perform restricted actions', function () {
    $superAdmin = createUserWithRole('Super Admin');

    $response = $this->actingAs($superAdmin)->post(route('shipments.store'), [
        'shipment_reference' => 'ADMIN-001',
        'brand' => 'Admin Brand',
        'incoterm' => 'CIF',
        'shipment_type_id' => 1,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('shipments', ['shipment_reference' => 'ADMIN-001']);
});

// ============================================================================
// RBAC & USER MANAGEMENT TESTS
// ============================================================================

test('unauthorized user cannot access users management', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('users.index'));

    $response->assertForbidden();
});

test('user with manage-rbac can access users management', function () {
    $user = createUserWithPermission('manage', 'rbac');

    $response = $this->actingAs($user)->get(route('users.index'));

    $response->assertOk();
});

test('unauthorized user cannot create users', function () {
    $user = User::factory()->create();
    $role = Role::factory()->create();

    $response = $this->actingAs($user)->post(route('users.store'), [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => 'Password123!',
        'role_ids' => [$role->role_id],
    ]);

    $response->assertStatus(403);
});

test('user with create-user permission can create users', function () {
    $user = createUserWithPermission('create', 'users');
    $role = Role::factory()->create();

    $response = $this->actingAs($user)->post(route('users.store'), [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => 'Password123!',
        'role_ids' => [$role->role_id],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
});

test('unauthorized user cannot update role permissions', function () {
    $role = Role::factory()->create();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->put(route('roles.permissions.update', $role), [
        'permission_ids' => [],
    ]);

    $response->assertStatus(403);
});

test('user with manage-rbac can update role permissions', function () {
    $targetRole = Role::factory()->create();
    $user = createUserWithPermission('manage', 'rbac');

    $response = $this->actingAs($user)->put(route('roles.permissions.update', $targetRole), [
        'permission_ids' => [],
    ]);

    $response->assertRedirect();
});

// ============================================================================
// SHIPMENT DOCUMENT & ARCHIVE TESTS
// ============================================================================

test('unauthorized user cannot upload documents', function () {
    $doc = ShipmentDocument::factory()->create();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(
        route('shipments.documents.upload', $doc->shipment_doc_id),
        ['file' => UploadedFile::fake()->create('test.pdf')]
    );

    $response->assertStatus(403);
});

test('authorized user can upload documents', function () {
    $doc = ShipmentDocument::factory()->create();
    $user = createUserWithPermission('upload', 'documents');

    $response = $this->actingAs($user)->post(
        route('shipments.documents.upload', $doc->shipment_doc_id),
        ['file' => UploadedFile::fake()->create('test.pdf')]
    );

    $response->assertRedirect();
});

test('unauthorized user cannot archive shipments', function () {
    $shipment = Shipment::factory()->create();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->patch(route('shipments.archive', $shipment));

    $response->assertStatus(403);
});

test('authorized user can archive shipments', function () {
    $shipment = Shipment::factory()->create();
    $user = createUserWithPermission('archive', 'shipments');

    $response = $this->actingAs($user)->patch(route('shipments.archive', $shipment));

    $response->assertRedirect();
    $this->assertNotNull($shipment->fresh()->archived_at);
});

// ============================================================================
// BROKER MANAGEMENT TESTS
// ============================================================================

test('unauthorized user cannot create brokers', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('brokers.store'), [
        'broker_name' => 'New Broker',
        'contact_person' => 'John Doe',
        'email' => 'broker@example.com',
    ]);

    $response->assertStatus(403);
});

test('authorized user can create brokers', function () {
    $user = createUserWithPermission('add', 'brokers');

    $response = $this->actingAs($user)->post(route('brokers.store'), [
        'broker_name' => 'New Broker',
        'contact_person' => 'John Doe',
        'email' => 'broker@example.com',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('brokers', ['broker_name' => 'New Broker']);
});

test('unauthorized user cannot edit brokers', function () {
    $broker = Broker::factory()->create();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->patch(route('brokers.update', $broker), [
        'broker_name' => 'Updated Broker',
    ]);

    $response->assertStatus(403);
});

test('authorized user can edit brokers', function () {
    $broker = Broker::factory()->create();
    $user = createUserWithPermission('edit', 'brokers');

    $response = $this->actingAs($user)->patch(route('brokers.update', $broker), [
        'broker_name' => 'Updated Broker',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('brokers', ['broker_name' => 'Updated Broker']);
});

// ============================================================================
// PUBLIC ROUTES FOR AUTHENTICATED USERS
// ============================================================================

test('authenticated user can access dashboard without specific permission', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
});

test('authenticated user can access reports without specific permission', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('reports.index'));

    $response->assertOk();
});

test('authenticated user can access logs without specific permission', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('logs.index'));

    $response->assertOk();
});
