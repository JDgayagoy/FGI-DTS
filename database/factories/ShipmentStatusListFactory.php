<?php

namespace Database\Factories;

use App\Models\ShipmentStatusList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentStatusList>
 */
class ShipmentStatusListFactory extends Factory
{
    protected $model = ShipmentStatusList::class;

    public function definition(): array
    {
        return [
            'status_name' => $this->faker->unique()->word(),
        ];
    }
}
