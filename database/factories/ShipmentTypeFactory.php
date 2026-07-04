<?php

namespace Database\Factories;

use App\Models\ShipmentType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentType>
 */
class ShipmentTypeFactory extends Factory
{
    protected $model = ShipmentType::class;

    public function definition(): array
    {
        return [
            'shipment_type_name' => $this->faker->unique()->word(),
        ];
    }
}
