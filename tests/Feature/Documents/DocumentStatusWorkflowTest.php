<?php

use App\Models\DocumentStatus;

use function Pest\Laravel\actingAs;

test('document initially has no status', function () {
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    $document->load('currentStatus');
    expect($document->currentStatus)->toBeNull();
    expect($document->documentStatuses()->count())->toBe(0);
});

test('user with approve-documents permission can approve document', function () {
    // ARRANGE
    $user = createUserWithPermission('approve', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    // ACT
    $response = actingAs($user)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status_id' => 1] // Approved status ID = 1
    );

    // ASSERT
    $response->assertRedirect();
    $document->load('currentStatus');
    assertDocumentHasStatus($document, 'Approved');
    expect($document->currentStatus->is_current)->toBeTrue();
    expect($document->currentStatus->changed_by)->toBe($user->id);
});

test('user with reject-documents permission can reject document', function () {
    // ARRANGE
    $user = createUserWithPermission('reject', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    // ACT
    $response = actingAs($user)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status_id' => 3] // Rejected status ID = 3
    );

    // ASSERT
    $response->assertRedirect();
    $document->load('currentStatus');
    assertDocumentHasStatus($document, 'Rejected');
    expect($document->currentStatus->is_current)->toBeTrue();
    expect($document->currentStatus->changed_by)->toBe($user->id);
});

test('status change updates is_current flag and timestamp', function () {
    // ARRANGE
    $user1 = createUserWithPermission('approve', 'documents');
    $user2 = createUserWithPermission('reject', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    // ACT: First approval
    actingAs($user1)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status_id' => 1] // Approved
    );

    $document->load('currentStatus');
    $oldStatus = $document->currentStatus;
    expect($oldStatus->is_current)->toBeTrue();
    expect($oldStatus->changed_by)->toBe($user1->id);
    $oldStatusId = $oldStatus->doc_status_id;
    $oldChangedAt = $oldStatus->changed_at;

    // ACT: Change to Rejected
    actingAs($user2)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status_id' => 3] // Rejected
    );

    // ASSERT
    $document->load('currentStatus');
    $newStatus = $document->currentStatus;

    // Old status should no longer be current
    $oldStatusRecord = DocumentStatus::find($oldStatusId);
    expect($oldStatusRecord)->not->toBeNull();
    expect($oldStatusRecord->is_current)->toBeFalse();

    // New status should be current
    expect($newStatus->is_current)->toBeTrue();
    expect($newStatus->changed_by)->toBe($user2->id);
    expect($newStatus->status_id)->toBe(3);
    // New changed_at should be equal or later (allowing for very fast execution)
    expect($newStatus->changed_at->timestamp)->toBeGreaterThanOrEqual($oldChangedAt->timestamp);
});
