<?php

namespace Tests\Helpers;

use App\Models\CustomDoc;
use App\Models\DocumentStatus;
use App\Models\DocumentStatusList;
use App\Models\Shipment;
use App\Models\ShipmentDocument;

class DocumentTestHelper
{
    /**
     * Create a shipment document with optional status
     */
    public static function createDocument(
        Shipment $shipment,
        ?string $statusName = null,
        array $overrides = []
    ): ShipmentDocument {
        $customDoc = CustomDoc::first() ?? CustomDoc::factory()->create();

        $document = ShipmentDocument::factory()->create(array_merge([
            'shipment_id' => $shipment->shipment_id,
            'custom_doc_id' => $customDoc->custom_doc_id,
        ], $overrides));

        if ($statusName) {
            self::setDocumentStatus($document, $statusName);
        }

        return $document->refresh();
    }

    /**
     * Create multiple documents for a shipment
     */
    public static function createDocuments(
        Shipment $shipment,
        int $count = 3,
        ?string $statusName = null,
        array $overrides = []
    ): array {
        $documents = [];

        for ($i = 0; $i < $count; $i++) {
            $documents[] = self::createDocument($shipment, $statusName, $overrides);
        }

        return $documents;
    }

    /**
     * Set or update document status
     */
    public static function setDocumentStatus(
        ShipmentDocument $document,
        string $statusName,
        ?int $changedBy = null
    ): DocumentStatus {
        $status = DocumentStatusList::where('status_name', $statusName)->firstOrFail();

        // Mark previous current status as not current
        $document->documentStatuses()
            ->where('is_current', true)
            ->update(['is_current' => false]);

        // Create new status
        return DocumentStatus::factory()->create([
            'shipment_doc_id' => $document->shipment_doc_id,
            'status_id' => $status->status_id,
            'is_current' => true,
            'changed_by' => $changedBy,
            'changed_at' => now(),
        ]);
    }

    /**
     * Create document with file
     */
    public static function createDocumentWithFile(
        Shipment $shipment,
        ?string $statusName = null,
        array $fileData = []
    ): ShipmentDocument {
        return self::createDocument($shipment, $statusName, array_merge([
            'file_name' => $fileData['name'] ?? 'test-document.pdf',
            'file_path' => $fileData['path'] ?? 'documents/test-document.pdf',
        ], $fileData['overrides'] ?? []));
    }

    /**
     * Get documents by status
     */
    public static function getDocumentsByStatus(Shipment $shipment, string $statusName): array
    {
        $status = DocumentStatusList::where('status_name', $statusName)->firstOrFail();

        return $shipment->documents()
            ->whereHas('currentStatus', fn ($q) => $q->where('status_id', $status->status_id))
            ->get()
            ->toArray();
    }

    /**
     * Get pending documents (no current status)
     */
    public static function getPendingDocuments(Shipment $shipment): array
    {
        return $shipment->documents()
            ->whereDoesntHave('currentStatus')
            ->get()
            ->toArray();
    }

    /**
     * Assert document has status
     */
    public static function assertDocumentHasStatus(ShipmentDocument $document, string $statusName): void
    {
        $status = DocumentStatusList::where('status_name', $statusName)->firstOrFail();
        $currentStatus = $document->currentStatus;
        $docId = $document->shipment_doc_id;

        if (! $currentStatus || $currentStatus->status_id !== $status->status_id) {
            $current = $currentStatus?->status?->status_name ?? 'None';
            throw new \Exception(
                "Expected document {$docId} to have status '{$statusName}', "
                ."but has status '{$current}'"
            );
        }
    }

    /**
     * Assert document has no current status
     */
    public static function assertDocumentHasNoPendingStatus(ShipmentDocument $document): void
    {
        $document->refresh();
        $currentStatus = $document->currentStatus;
        $docId = $document->shipment_doc_id;

        if ($currentStatus) {
            $statusName = $currentStatus->status?->status_name ?? 'Unknown';
            throw new \Exception(
                "Expected document {$docId} to have no current status, "
                ."but has status '{$statusName}'"
            );
        }
    }

    /**
     * Get all available document types
     */
    public static function getDocumentTypes(): array
    {
        return CustomDoc::all()->pluck('custom_doc_name')->toArray();
    }

    /**
     * Get all available document statuses
     */
    public static function getDocumentStatuses(): array
    {
        return DocumentStatusList::all()->pluck('status_name')->toArray();
    }

    /**
     * Count documents by status
     */
    public static function countDocumentsByStatus(Shipment $shipment, string $statusName): int
    {
        return count(self::getDocumentsByStatus($shipment, $statusName));
    }
}
