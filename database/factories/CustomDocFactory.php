<?php

namespace Database\Factories;

use App\Models\CustomDoc;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomDoc>
 */
class CustomDocFactory extends Factory
{
    protected $model = CustomDoc::class;

    public function definition(): array
    {
        return [
            'doc_name' => $this->faker->unique()->word(),
        ];
    }
}
