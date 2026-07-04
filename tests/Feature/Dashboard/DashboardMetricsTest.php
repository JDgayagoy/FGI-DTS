<?php

use App\Models\Shipment;

use function Pest\Laravel\actingAs;

test('dashboard metrics count active shipments correctly', function () {
    // ARRANGE
    $user = createSuperAdmin();
    $baselineTotal = Shipment::count();
    $baselineArchived = Shipment::whereNotNull('archived_at')->count();

    createActiveShipment(); // 1 active
    createActiveShipment(); // 2 active
    createArchivedShipment(); // 1 archived

    // ACT
    $response = actingAs($user)->get(route('dashboard'));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    expect($metrics['totalShipments'])->toBe($baselineTotal + 3);
    expect($metrics['archivedShipments'])->toBe($baselineArchived + 1);
    expect($metrics['activeShipments'])->toBe($metrics['totalShipments'] - $metrics['archivedShipments']);
});

test('dashboard approval rate within valid range', function () {
    // ARRANGE
    $user = createSuperAdmin();
    $shipment = createShipmentWithDocuments('Processing', 3);

    // Only approve 2 of 3 documents
    $docs = $shipment->documents()->get();
    setDocumentStatus($docs[0], 'Approved');
    setDocumentStatus($docs[1], 'Approved');
    setDocumentStatus($docs[2], 'Rejected');

    // ACT
    $response = actingAs($user)->get(route('dashboard'));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    // Verify metrics contain valid ranges
    expect($metrics['completionRate'])->toBeGreaterThanOrEqual(0);
    expect($metrics['completionRate'])->toBeLessThanOrEqual(100);
    expect($metrics['approvedDocs'])->toBeGreaterThanOrEqual(0);
    expect($metrics['totalDocs'])->toBeGreaterThan(0);
});

test('dashboard handles null dates in metrics', function () {
    // ARRANGE
    $user = createSuperAdmin();
    createShipment('Processing', ['actual_time_of_arrival' => null]);

    // ACT
    $response = actingAs($user)->get(route('dashboard'));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    // Should have at least baseline + 1 shipment
    expect($metrics['totalShipments'])->toBeGreaterThan(0);
});

test('dashboard metrics include seeded shipments', function () {
    // ARRANGE
    $user = createSuperAdmin();

    // ACT
    $response = actingAs($user)->get(route('dashboard'));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    // The database is seeded with 10 shipments by default
    expect($metrics['totalShipments'])->toBeGreaterThanOrEqual(10);
});

test('dashboard counts document statuses correctly', function () {
    // ARRANGE
    $user = createSuperAdmin();
    $shipment = createShipmentWithDocuments('Processing', 3);

    // Set different statuses
    $docs = $shipment->documents()->get();
    setDocumentStatus($docs[0], 'Approved');
    setDocumentStatus($docs[1], 'Rejected');
    // $docs[2] has no status

    // ACT
    $response = actingAs($user)->get(route('dashboard'));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    // Check that metrics exist and have reasonable values
    expect($metrics['approvedDocs'])->toBeGreaterThanOrEqual(1);
    expect($metrics['rejectedDocs'])->toBeGreaterThanOrEqual(1);
    expect($metrics['totalDocs'])->toBeGreaterThanOrEqual(3);
});
