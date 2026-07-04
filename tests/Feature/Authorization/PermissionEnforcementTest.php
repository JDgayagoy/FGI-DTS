<?php

use App\Models\ShipmentType;

use function Pest\Laravel\actingAs;

test('user without add-shipments permission cannot create shipment', function () {
    // ARRANGE
    $user = createUserWithoutPermissions();
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    // ACT & ASSERT
    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-'.time(),
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertForbidden();
});

test('user without edit-shipments permission cannot update shipment', function () {
    // ARRANGE
    $user = createUserWithoutPermissions();
    $shipment = createShipment('Processing');

    // ACT & ASSERT
    $response = actingAs($user)->put(route('shipments.update', $shipment), [
        'shipment_reference' => $shipment->shipment_reference,
        'brand' => 'UpdatedBrand',
        'incoterm' => 'DAP',
        'shipment_type_id' => $shipment->shipment_type_id,
    ]);

    $response->assertForbidden();
});

test('user without archive-shipments permission cannot archive shipment', function () {
    // ARRANGE
    $user = createUserWithoutPermissions();
    $shipment = createActiveShipment();

    // ACT & ASSERT
    $response = actingAs($user)->patch(route('shipments.archive', $shipment));

    $response->assertForbidden();
});

test('user without upload-documents permission cannot upload document', function () {
    // ARRANGE
    $user = createUserWithoutPermissions();
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents()->first();

    // ACT & ASSERT
    $response = actingAs($user)->post(route('shipments.documents.upload', $doc->shipment_doc_id), [
        'file' => 'fake-file-content',
    ]);

    $response->assertForbidden();
});

test('user without approve-documents permission cannot approve document', function () {
    // ARRANGE
    $user = createUserWithoutPermissions();
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents()->first();

    // ACT & ASSERT
    $response = actingAs($user)->post(
        route('shipments.documents.status', $doc->shipment_doc_id),
        ['status_id' => 1]
    );

    $response->assertForbidden();
});

test('user without reject-documents permission cannot reject document', function () {
    // ARRANGE
    $user = createUserWithoutPermissions();
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents()->first();

    // ACT & ASSERT
    $response = actingAs($user)->post(
        route('shipments.documents.status', $doc->shipment_doc_id),
        ['status_id' => 3]
    );

    $response->assertForbidden();
});

test('unauthenticated user cannot access protected routes', function () {
    // ARRANGE - No user

    // ACT & ASSERT
    $response = $this->get(route('dashboard'));

    $response->assertRedirect();
    expect($response->getStatusCode())->toBe(302);
});

test('user with permission can perform authorized action', function () {
    // ARRANGE
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    // ACT
    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'AUTH-'.time(),
        'brand' => 'AuthorizedBrand',
        'incoterm' => 'FOB',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    // ASSERT
    $response->assertRedirect(route('shipments.index'));
});

test('superadmin can access dashboard and reports', function () {
    // ARRANGE
    $admin = createSuperAdmin();

    // ACT & ASSERT
    actingAs($admin)->get(route('dashboard'))->assertSuccessful();
    actingAs($admin)->get(route('reports.index'))->assertSuccessful();
});

test('user with upload-documents permission can upload', function () {
    // ARRANGE
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents()->first();

    // ACT
    $response = actingAs($user)->post(route('shipments.documents.upload', $doc->shipment_doc_id), [
        'file' => 'test content',
    ]);

    // ASSERT - Should not return 403 (Forbidden)
    expect($response->getStatusCode())->not->toBe(403);
});

test('multiple users with different permissions act independently', function () {
    // ARRANGE
    $shipmentUser = createUserWithPermission('add', 'shipments');
    $documentUser = createUserWithPermission('upload', 'documents');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    // ACT & ASSERT - shipmentUser can create but not upload
    actingAs($shipmentUser)->post(route('shipments.store'), [
        'shipment_reference' => 'SHIP-'.time(),
        'brand' => 'Brand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ])->assertRedirect();

    // Create doc for upload test
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents()->first();

    // documentUser can upload but not create shipment
    actingAs($documentUser)->post(route('shipments.store'), [
        'shipment_reference' => 'UPLOAD-'.time(),
        'brand' => 'Brand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ])->assertForbidden();
});
