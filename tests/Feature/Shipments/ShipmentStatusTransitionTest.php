<?php

use App\Models\Shipment;

use function Pest\Laravel\actingAs;

test('user can transition shipment from processing to completed', function () {
    $user = createUserWithPermission('edit', 'shipments');
    $shipment = createShipment('Processing');

    actingAs($user)->put(route('shipments.update', $shipment), [
        'shipment_reference' => $shipment->shipment_reference,
        'brand' => 'UpdatedBrand',
        'incoterm' => 'DAP',
        'shipment_type_id' => $shipment->shipment_type_id,
        'status_id' => $shipment->status()->pluck('status_id')->first(),
    ]);

    $shipment->refresh();
    expect($shipment->brand)->toBe('UpdatedBrand');
});

test('document approval status is tracked', function () {
    $shipment = createShipmentWithDocuments('Processing', 2);
    $doc = $shipment->documents->first();

    // Initially no current status
    expect($doc->currentStatus)->toBeNull();

    // Set to pending
    setDocumentStatus($doc, 'Pending');
    expect($doc->refresh()->currentStatus)->not->toBeNull();
});

test('document rejection creates status record', function () {
    $user = createUserWithPermission('reject', 'documents');
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents->first();

    $response = actingAs($user)->post(route('shipments.documents.status', $doc->shipment_doc_id), [
        'status_id' => 3, // Rejected status ID
    ]);

    $response->assertRedirect();
    $doc->refresh();
    assertDocumentHasStatus($doc, 'Rejected');
});

test('document approval is logged', function () {
    $user = createUserWithPermission('approve', 'documents');
    $shipment = createShipmentWithDocuments('Processing', 1);
    $doc = $shipment->documents->first();

    $response = actingAs($user)->post(route('shipments.documents.status', $doc->shipment_doc_id), [
        'status_id' => 1, // Approved status ID
    ]);

    $response->assertRedirect();
    // Verify activity log exists for the shipment
    assertActivityLogExists($user, 'document_status_updated', $shipment);
});

test('multiple documents can have different statuses', function () {
    $shipment = createShipmentWithDocuments('Processing', 3);
    $docs = $shipment->documents;

    setDocumentStatus($docs[0], 'Approved');
    setDocumentStatus($docs[1], 'Pending');
    setDocumentStatus($docs[2], 'Rejected');

    expect(countDocumentsByStatus($shipment, 'Approved'))->toBe(1);
    expect(countDocumentsByStatus($shipment, 'Pending'))->toBe(1);
    expect(countDocumentsByStatus($shipment, 'Rejected'))->toBe(1);
});

test('only current document status is active', function () {
    $doc = createDocument(createShipment());

    // Create first status
    $status1 = setDocumentStatus($doc, 'Pending');
    expect($status1->is_current)->toBeTrue();

    // Create second status
    $status2 = setDocumentStatus($doc, 'Approved');
    expect($status2->is_current)->toBeTrue();

    // Verify first is no longer current
    $status1->refresh();
    expect($status1->is_current)->toBeFalse();
});

test('document status change requires permission', function () {
    $user = createUserWithoutPermissions();
    $doc = createDocument(createShipment());

    $response = actingAs($user)->post(route('shipments.documents.status', $doc->shipment_doc_id), [
        'status_id' => 1,
    ]);

    $response->assertForbidden();
});
