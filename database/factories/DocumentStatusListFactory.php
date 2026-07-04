<?php

namespace Database\Factories;

use App\Models\DocumentStatusList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentStatusList>
 */
class DocumentStatusListFactory extends Factory
{
    protected $model = DocumentStatusList::class;

    public function definition(): array
    {
        return [
            'status_name' => $this->faker->unique()->word(),
        ];
    }
}
