<?php

namespace Database\Factories;

use App\Models\CustomDoc;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentDocument>
 */
class ShipmentDocumentFactory extends Factory
{
    protected $model = ShipmentDocument::class;

    public function definition(): array
    {
        $shipment = Shipment::first() ?? Shipment::factory()->create();
        $customDoc = CustomDoc::first() ?? CustomDoc::factory()->create();

        return [
            'shipment_id' => $shipment->shipment_id,
            'custom_doc_id' => $customDoc->custom_doc_id,
            'file_name' => $this->faker->word() . '.pdf',
            'file_path' => 'documents/' . $this->faker->uuid() . '.pdf',
        ];
    }
}
