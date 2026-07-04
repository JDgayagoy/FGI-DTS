<?php

namespace Database\Factories;

use App\Models\Broker;
use App\Models\Shipment;
use App\Models\ShipmentStatusList;
use App\Models\ShipmentType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shipment>
 */
class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
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
}
