<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    Storage::fake('public');
});

test('user with upload-documents permission can upload file', function () {
    // ARRANGE
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null); // No status yet
    $file = UploadedFile::fake()->create('test.pdf', 100, 'application/pdf'); // 100 KB PDF

    // ACT
    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    // ASSERT
    $response->assertRedirect();
    $document->refresh();
    expect($document->file_name)->toBe('test.pdf');
    expect($document->file_path)->toMatch('/shipment-docs/');
    Storage::disk('public')->assertExists($document->file_path);
    assertActivityLogExists($user, 'document_uploaded', $document);
});

test('file size limit of 10 MB enforced', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $largeFile = UploadedFile::fake()->create('large.pdf', 11000); // 11 MB (exceeds 10240 KB limit)

    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $largeFile]
    );

    $response->assertRedirect()->withErrors('file');
});

test('old file deleted when new file replaces it', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    // Upload first file
    $file1 = UploadedFile::fake()->create('test1.pdf', 100, 'application/pdf');
    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file1]
    );
    $oldPath = $document->refresh()->file_path;
    expect($oldPath)->not->toBeNull();

    // Upload second file
    $file2 = UploadedFile::fake()->create('test2.pdf', 100, 'application/pdf');
    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file2]
    );

    // Assert old file is deleted and new file exists
    Storage::disk('public')->assertMissing($oldPath);
    $document->refresh();
    expect($document->file_name)->toBe('test2.pdf');
    Storage::disk('public')->assertExists($document->file_path);
});

test('file upload logged with metadata', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->create('test.pdf', 250, 'application/pdf');

    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $log = getLatestUserActivityLog($user);
    expect($log->action)->toBe('document_uploaded');
    expect($log->subject_type)->toContain('ShipmentDocument');
    expect($log->subject_id)->toBe($document->shipment_doc_id);
});

test('uploaded document has no status initially', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->create('test.pdf', 100, 'application/pdf');

    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $document->load('currentStatus');
    expect($document->currentStatus)->toBeNull();
});

test('user without permission cannot upload', function () {
    $user = createUserWithoutPermissions();
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->create('test.pdf', 100, 'application/pdf');

    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $response->assertForbidden();
});

test('document file_path and file_name are stored correctly', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->create('invoice-2026-07.pdf', 500, 'application/pdf');

    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $document->refresh();
    // Verify file name is stored as original name
    expect($document->file_name)->toBe('invoice-2026-07.pdf');
    // Verify file path contains the shipment ID directory
    expect($document->file_path)->toContain('shipment-docs');
    expect($document->file_path)->toContain((string) $shipment->shipment_id);
});
