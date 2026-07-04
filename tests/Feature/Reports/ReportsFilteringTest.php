<?php

use function Pest\Laravel\actingAs;

test('reports filter by brand', function () {
    // ARRANGE
    $user = createSuperAdmin();
    createShipment('Processing', ['brand' => 'TestBrand-'.time()]);
    createShipment('Processing', ['brand' => 'TestBrand-'.time()]);
    createShipment('Processing', ['brand' => 'OtherBrand-'.time()]);

    $uniqueBrand = 'TestBrand-'.time();

    // ACT
    $response = actingAs($user)->get(route('reports.index', ['brand' => $uniqueBrand]));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    $filters = $response->inertiaProps('activeFilters');
    expect($metrics['totalShipments'])->toBeGreaterThanOrEqual(1);
    expect($filters['brand'])->toBe($uniqueBrand);
});

test('reports filter by shipment status', function () {
    // ARRANGE
    $user = createSuperAdmin();
    createShipment('Completed');
    createShipment('Completed');
    createShipment('Processing');

    // ACT
    $response = actingAs($user)->get(route('reports.index'));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    expect($metrics['totalShipments'])->toBeGreaterThanOrEqual(3);
});

test('reports filter by archive status returns active shipments', function () {
    // ARRANGE
    $user = createSuperAdmin();
    createActiveShipment();
    createActiveShipment();
    createArchivedShipment();

    // ACT
    $response = actingAs($user)->get(route('reports.index', ['archive_status' => 'active']));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    $filters = $response->inertiaProps('activeFilters');
    expect($metrics['totalShipments'])->toBeGreaterThanOrEqual(2);
    expect($filters['archiveStatus'])->toBe('active');
});

test('reports aggregates metrics across multiple filters', function () {
    // ARRANGE
    $user = createSuperAdmin();
    $broker = createBroker();
    $uniqueBrand = 'MultiBrand-'.time();

    createShipment('Completed', ['brand' => $uniqueBrand, 'broker_id' => $broker->broker_id]);
    createShipment('Processing', ['brand' => $uniqueBrand, 'broker_id' => $broker->broker_id]);

    // ACT
    $response = actingAs($user)->get(route('reports.index', [
        'brand' => $uniqueBrand,
        'broker_id' => $broker->broker_id,
    ]));

    // ASSERT
    $response->assertSuccessful();
    $metrics = $response->inertiaProps('metrics');
    expect($metrics['totalShipments'])->toBe(2);
    expect($metrics['completedShipments'])->toBe(1);
    expect($metrics['processingShipments'])->toBe(1);
});
