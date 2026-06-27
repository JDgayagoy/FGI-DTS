<?php

namespace Database\Factories;

use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
        // Ensure shipment type exists for foreign key constraint
        $shipmentTypeId = DB::table('shipment_types')->first()?->shipment_type_id;
        if (!$shipmentTypeId) {
            $shipmentTypeId = DB::table('shipment_types')->insertGetId([
                'shipment_type_name' => 'Sea',
            ]);
        }

        // Ensure status exists for foreign key constraint
        $statusId = DB::table('shipment_status_list')->first()?->status_id;
        if (!$statusId) {
            $statusId = DB::table('shipment_status_list')->insertGetId([
                'status_name' => 'Pending',
            ]);
        }

        return [
            'year' => 2026,
            'month' => 6,
            'shipment_reference' => 'FGI-'.$this->faker->unique()->numberBetween(100, 999),
            'brand' => $this->faker->company(),
            'incoterm' => 'FOB',
            'actual_time_of_arrival' => now(),
            'broker_id' => null,
            'brand_manager' => $this->faker->name(),
            'shipment_type_id' => $shipmentTypeId,
            'status_id' => $statusId,
        ];
    }
}
