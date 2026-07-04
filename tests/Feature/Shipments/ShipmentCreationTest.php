<?php

use App\Models\Shipment;
use App\Models\ShipmentType;

use function Pest\Laravel\actingAs;

test('user with add-shipments permission can create shipment', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'SHIP-'.time(),
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertRedirect(route('shipments.index'));
    $shipment = Shipment::where('shipment_reference', 'SHIP-'.time())->first();
    expect($shipment)->not->toBeNull();
    if ($shipment) {
        assertShipmentHasStatus($shipment, 'Pending');
    }
});

test('shipment created with pending status by default', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'DFLT-'.time(),
        'brand' => 'TestBrand',
        'incoterm' => 'FOB',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertRedirect();
    $shipment = Shipment::where('shipment_reference', 'DFLT-'.time())->first();
    expect($shipment)->not->toBeNull();
    if ($shipment) {
        assertShipmentHasStatus($shipment, 'Pending');
    }
});

test('shipment creation logs activity', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'LOG-'.time(),
        'brand' => 'AuditBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertRedirect();
    $shipment = Shipment::where('shipment_reference', 'LOG-'.time())->first();
    expect($shipment)->not->toBeNull();
    if ($shipment) {
        assertActivityLogExists($user, 'created', $shipment);
    }
});

test('user without permission cannot create shipment', function () {
    $user = createUserWithoutPermissions();
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'DENIED-'.time(),
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertForbidden();
    expect(Shipment::where('shipment_reference', 'DENIED-'.time())->exists())->toBeFalse();
});

test('shipment requires shipment_reference field', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertSessionHasErrors('shipment_reference');
});

test('shipment requires brand field', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-'.time(),
        'incoterm' => 'CIF',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $response->assertSessionHasErrors('brand');
});
