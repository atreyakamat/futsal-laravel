<?php

namespace Database\Factories;

use App\Models\Arena;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Arena>
 */
class ArenaFactory extends Factory
{
    protected $model = Arena::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->company() . ' Futsal';
        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'address' => $this->faker->address(),
            'status' => 'active',
        ];
    }
}
