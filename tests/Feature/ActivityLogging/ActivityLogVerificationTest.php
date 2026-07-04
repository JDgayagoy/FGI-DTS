<?php

use App\Models\Shipment;
use App\Models\ShipmentType;
use Illuminate\Http\UploadedFile;

use function Pest\Laravel\actingAs;

test('shipment creation logs activity', function () {
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
        assertActivityLogExists($user, 'created', $shipment);
        $log = getLatestUserActivityLog($user);
        expect($log)->not->toBeNull();
        expect($log->action)->toBe('created');
        expect($log->description)->toContain('Created shipment');
    }
});

test('shipment update logs activity with before and after values', function () {
    $user = createUserWithPermission('edit', 'shipments');
    $shipment = createShipment('Processing');

    $oldBrand = $shipment->brand;
    $newBrand = 'UpdatedBrand-'.time();

    $response = actingAs($user)->patch(route('shipments.update', $shipment->shipment_id), [
        'brand' => $newBrand,
    ]);

    $response->assertRedirect(route('shipments.index'));
    $shipment->refresh();
    expect($shipment->brand)->toBe($newBrand);

    assertActivityLogExists($user, 'updated', $shipment);
    $log = getLatestUserActivityLog($user);
    expect($log)->not->toBeNull();
    expect($log->action)->toBe('updated');
    expect($log->description)->toContain('Updated shipment');
    expect($log->properties)->toHaveKey('old');
    expect($log->properties)->toHaveKey('new');
    expect($log->properties['new']['brand'])->toBe($newBrand);
});

test('shipment archive logs activity', function () {
    $user = createUserWithPermission('archive', 'shipments');
    $shipment = createActiveShipment();

    $response = actingAs($user)->patch(route('shipments.archive', $shipment->shipment_id));

    $response->assertRedirect();
    $shipment->refresh();
    expect($shipment->archived_at)->not->toBeNull();

    assertActivityLogExists($user, 'archived', $shipment);
    $log = getLatestUserActivityLog($user);
    expect($log)->not->toBeNull();
    expect($log->action)->toBe('archived');
    expect($log->description)->toContain('Archived shipment');
});

test('document upload logs activity', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, 'Pending');

    // Create a fake PDF file
    $file = UploadedFile::fake()->create('test.pdf', 100, 'application/pdf');

    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $response->assertRedirect();
    $document->refresh();
    expect($document->file_path)->not->toBeNull();
    expect($document->file_name)->toBe('test.pdf');

    assertActivityLogExists($user, 'document_uploaded', $document);
    $log = getLatestUserActivityLog($user);
    expect($log)->not->toBeNull();
    expect($log->action)->toBe('document_uploaded');
    expect($log->description)->toContain('Uploaded document');
    expect($log->description)->toContain('test.pdf');
});

test('document status change logs activity with new status', function () {
    $user = createUserWithPermission('approve', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, 'Pending');

    $response = actingAs($user)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status_id' => 1] // 1 = Approved
    );

    $response->assertRedirect();
    $document->refresh();
    $currentStatus = $document->currentStatus;
    expect($currentStatus)->not->toBeNull();
    expect($currentStatus->status_id)->toBe(1);

    assertActivityLogExists($user, 'document_status_updated', $shipment);
    $log = getLatestUserActivityLog($user);
    expect($log)->not->toBeNull();
    expect($log->action)->toBe('document_status_updated');
    expect($log->description)->toContain('Updated document status');
    expect($log->properties)->toHaveKey('shipment_doc_id');
    expect($log->properties)->toHaveKey('new_status_id');
    expect($log->properties['new_status_id'])->toBe(1);
});

test('activity log captures correct user and timestamp', function () {
    $user = createUserWithPermission('add', 'shipments');
    $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();

    actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TSTMP-'.time(),
        'brand' => 'TimestampTest',
        'incoterm' => 'FOB',
        'shipment_type_id' => $shipmentType->shipment_type_id,
    ]);

    $log = getLatestUserActivityLog($user);
    expect($log)->not->toBeNull();
    expect($log->user_id)->toBe($user->id);
    expect($log->created_at)->not->toBeNull();
    expect($log->action)->toBe('created');
});
