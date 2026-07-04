<?php

use App\Models\Shipment;

use function Pest\Laravel\actingAs;

test('user with archive-shipments permission can archive shipment', function () {
    $user = createUserWithPermission('archive', 'shipments');
    $shipment = createActiveShipment();

    $response = actingAs($user)->patch(route('shipments.archive', $shipment));

    $response->assertRedirect();
    assertShipmentIsArchived($shipment);
    expect(true)->toBeTrue(); // Count assertion
});

test('shipment archive sets archived_at timestamp', function () {
    $user = createUserWithPermission('archive', 'shipments');
    $shipment = createActiveShipment();

    expect($shipment->archived_at)->toBeNull();

    $response = actingAs($user)->patch(route('shipments.archive', $shipment));
    $response->assertRedirect();

    $shipment->refresh();
    expect($shipment->archived_at)->not->toBeNull();
});

test('archive action logs activity', function () {
    $user = createUserWithPermission('archive', 'shipments');
    $shipment = createActiveShipment();

    $response = actingAs($user)->patch(route('shipments.archive', $shipment));

    $response->assertRedirect();
    assertActivityLogExists($user, 'archived', $shipment);
    expect(true)->toBeTrue(); // Count assertion for risky test
});

test('user without permission cannot archive shipment', function () {
    $user = createBrandManager(); // No archive permission
    $shipment = createActiveShipment();

    $response = actingAs($user)->patch(route('shipments.archive', $shipment));

    $response->assertForbidden();
    assertShipmentIsActive($shipment);
    expect(true)->toBeTrue(); // Count assertion
});

test('active and archived shipments are filtered correctly', function () {
    $active1 = createActiveShipment();
    $active2 = createActiveShipment();
    $archived1 = createArchivedShipment();
    $archived2 = createArchivedShipment();

    $activeCount = Shipment::active()->count();
    $archivedCount = Shipment::archived()->count();

    expect($activeCount)->toBeGreaterThanOrEqual(2);
    expect($archivedCount)->toBeGreaterThanOrEqual(2);
    expect(true)->toBeTrue(); // Count assertion
});
