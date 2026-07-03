<?php

namespace Database\Factories;

use App\Models\DocumentStatus;
use App\Models\DocumentStatusList;
use App\Models\ShipmentDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentStatus>
 */
class DocumentStatusFactory extends Factory
{
    protected $model = DocumentStatus::class;

    public function definition(): array
    {
        $status = DocumentStatusList::first() ?? DocumentStatusList::factory()->create();
        $document = ShipmentDocument::first() ?? ShipmentDocument::factory()->create();

        return [
            'shipment_doc_id' => $document->shipment_doc_id,
            'status_id' => $status->status_id,
            'is_current' => true,
            'changed_by' => null,
            'changed_at' => now(),
        ];
    }
}
