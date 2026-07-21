<?php

namespace Database\Factories;

<<<<<<< HEAD
use App\Models\Broker;
use App\Models\Shipment;
use App\Models\ShipmentStatusList;
use App\Models\ShipmentType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shipment>
 */
=======
use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
<<<<<<< HEAD
        $status = ShipmentStatusList::first() ?? ShipmentStatusList::factory()->create();
        $type = ShipmentType::first() ?? ShipmentType::factory()->create();
        $broker = Broker::first() ?? Broker::factory()->create();

        return [
            'year' => now()->year,
            'month' => now()->month,
            'shipment_reference' => $this->faker->unique()->bothify('????-########'),
            'brand' => $this->faker->word(),
            'incoterm' => $this->faker->randomElement(['CIF', 'FOB', 'EXW', 'DAP']),
            'actual_time_of_arrival' => $this->faker->dateTime(),
            'broker_id' => $broker->broker_id,
            'brand_manager' => $this->faker->name(),
            'shipment_type_id' => $type->shipment_type_id,
            'status_id' => $status->status_id,
            'archived_at' => null,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'archived_at' => now(),
        ]);
    }
=======
        // Ensure shipment type exists for foreign key constraint
        $shipmentTypeId = DB::table('shipment_types')->first()?->shipment_type_id;
        if (! $shipmentTypeId) {
            $shipmentTypeId = DB::table('shipment_types')->insertGetId([
                'shipment_type_name' => 'Sea',
            ]);
        }

        // Ensure status exists for foreign key constraint
        $statusId = DB::table('shipment_status_list')->first()?->status_id;
        if (! $statusId) {
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
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
}
