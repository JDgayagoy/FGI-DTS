<?php

namespace Tests\Helpers;

use App\Models\Broker;
use App\Models\DocumentStatus;
use App\Models\DocumentStatusList;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use App\Models\ShipmentStatusList;
use App\Models\ShipmentType;

class ShipmentTestHelper
{
    /**
     * Create a shipment with a specific status
     */
    public static function createShipment(string $statusName = 'Processing', array $overrides = []): Shipment
    {
        $status = ShipmentStatusList::where('status_name', $statusName)->firstOrFail();
        $shipmentType = ShipmentType::first() ?? ShipmentType::factory()->create();
        $broker = Broker::first() ?? Broker::factory()->create();

        return Shipment::factory()->create(array_merge([
            'status_id' => $status->status_id,
            'shipment_type_id' => $shipmentType->shipment_type_id,
            'broker_id' => $broker->broker_id,
        ], $overrides));
    }

    /**
     * Create a shipment with documents
     */
    public static function createShipmentWithDocuments(
        string $statusName = 'Processing',
        int $documentCount = 3,
        array $shipmentOverrides = [],
        array $documentOverrides = []
    ): Shipment {
        $shipment = self::createShipment($statusName, $shipmentOverrides);

        for ($i = 0; $i < $documentCount; $i++) {
            ShipmentDocument::factory()
                ->for($shipment)
                ->create($documentOverrides);
        }

        return $shipment->load('documents');
    }

    /**
     * Create an active (non-archived) shipment
     */
    public static function createActiveShipment(array $overrides = []): Shipment
    {
        return self::createShipment('Processing', array_merge([
            'archived_at' => null,
        ], $overrides));
    }

    /**
     * Create an archived shipment
     */
    public static function createArchivedShipment(array $overrides = []): Shipment
    {
        return self::createShipment('Completed', array_merge([
            'archived_at' => now(),
        ], $overrides));
    }

    /**
     * Transition a shipment to a new status
     */
    public static function transitionShipmentStatus(Shipment $shipment, string $newStatusName): Shipment
    {
        $status = ShipmentStatusList::where('status_name', $newStatusName)->firstOrFail();
        $shipment->update(['status_id' => $status->status_id]);

        return $shipment->refresh();
    }

    /**
     * Create multiple shipments with various statuses
     */
    public static function createShipmentsWithStatuses(array $statuses): array
    {
        return array_map(
            fn ($statusName) => self::createShipment($statusName),
            $statuses
        );
    }

    /**
     * Get all available shipment statuses
     */
    public static function getShipmentStatuses(): array
    {
        return ShipmentStatusList::all()->pluck('status_name')->toArray();
    }

    /**
     * Create a shipment with documents in specific status
     */
    public static function createShipmentWithApprovedDocuments(int $count = 3): Shipment
    {
        $shipment = self::createShipment();
        $approvedStatus = DocumentStatusList::where('status_name', 'Approved')->first();

        if (! $approvedStatus) {
            $approvedStatus = DocumentStatusList::factory()->create(['status_name' => 'Approved']);
        }

        for ($i = 0; $i < $count; $i++) {
            $document = ShipmentDocument::factory()->for($shipment)->create();
            DocumentStatus::factory()
                ->for($document)
                ->create(['status_id' => $approvedStatus->status_id, 'is_current' => true]);
        }

        return $shipment->load('documents.currentStatus');
    }

    /**
     * Assert shipment has correct status
     */
    public static function assertShipmentHasStatus(Shipment $shipment, string $statusName): void
    {
        $status = ShipmentStatusList::where('status_name', $statusName)->firstOrFail();
        $shipment->refresh();

        if ($shipment->status_id !== $status->status_id) {
            throw new \Exception(
                "Expected shipment {$shipment->shipment_id} to have status '{$statusName}' "
                ."(ID: {$status->status_id}), but has status ID {$shipment->status_id}"
            );
        }
    }

    /**
     * Assert shipment is archived
     */
    public static function assertShipmentIsArchived(Shipment $shipment): void
    {
        $shipment->refresh();

        if (is_null($shipment->archived_at)) {
            throw new \Exception("Expected shipment {$shipment->shipment_id} to be archived, but it's not.");
        }
    }

    /**
     * Assert shipment is not archived
     */
    public static function assertShipmentIsActive(Shipment $shipment): void
    {
        $shipment->refresh();

        if (! is_null($shipment->archived_at)) {
            throw new \Exception("Expected shipment {$shipment->shipment_id} to be active, but it's archived.");
        }
    }
}
