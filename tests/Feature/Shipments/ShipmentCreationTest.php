<?php

use App\Models\Shipment;
use App\Models\ShipmentType;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\post;

test('user with permission can create shipment', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-001-'.time(),
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertRedirect();
    $shipment = Shipment::latest()->first();
    expect($shipment)->not->toBeNull();
    assertShipmentHasStatus($shipment, 'Pending');
});

test('user without permission cannot create shipment', function () {
    $user = createUserWithoutPermissions();
    $broker = Broker::first() ?? Broker::factory()->create();
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-002-'.time(),
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertForbidden();
});

test('shipment creation logs activity', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'AUDIT-' . time(),
        'brand' => 'AuditBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $shipment = Shipment::latest()->first();
    assertActivityLogExists($user, 'created', $shipment);
});

test('required shipment reference field', function () {
    $user = createUserWithPermission('add', 'shipments');

    $response = actingAs($user)->post(route('shipments.store'), [
        'brand' => 'Test',
        'incoterm' => 'CIF',
        'shipment_type_id' => ShipmentType::first()->shipment_type_id ?? 1,
    ]);

    $response->assertInvalid('shipment_reference');
});

test('user can access shipment index', function () {
    $user = createUserWithPermission('view', 'shipments');
    createShipment();

    $response = actingAs($user)->get(route('shipments.index'));

    $response->assertOk();
});

test('active and archived shipments are correctly marked', function () {
    createActiveShipment();
    $archived = createArchivedShipment();

    // Verify the helpers work correctly
    assertShipmentIsActive(Shipment::where('archived_at', null)->first());
    assertShipmentIsArchived($archived);
});
