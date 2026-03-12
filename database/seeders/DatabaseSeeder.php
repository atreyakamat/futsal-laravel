<?php

namespace Database\Seeders;

use App\Models\Arena;
use App\Models\Pricing;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \Illuminate\Database\Eloquent\Model::unguard();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $mapusa = Arena::create([
            'id' => 1,
            'name' => 'Mapusa Futsal Arena',
            'slug' => 'mapusa-futsal',
            'address' => 'Near KTC Bus Stand, Mapusa, Goa 403507',
            'status' => 'active'
        ]);

        $assagao = Arena::create([
            'id' => 2,
            'name' => 'Assagao Sports Complex',
            'slug' => 'assagao-futsal',
            'address' => 'Main Road, Assagao, Bardez, Goa 403507',
            'status' => 'active'
        ]);

        $panjim = Arena::create([
            'id' => 3,
            'name' => 'Panjim Central Arena',
            'slug' => 'panjim-futsal',
            'address' => 'Near Miramar Beach, Panaji, Goa 403001',
            'status' => 'active'
        ]);

        // Add some pricing
        Pricing::create(['arena_id' => 1, 'time_slot' => '18:00-19:00', 'price' => 800.00]);
        Pricing::create(['arena_id' => 1, 'time_slot' => '19:00-20:00', 'price' => 800.00]);
        Pricing::create(['arena_id' => 1, 'time_slot' => '20:00-21:00', 'price' => 800.00]);

        Pricing::create(['arena_id' => 2, 'time_slot' => '18:00-19:00', 'price' => 750.00]);
        Pricing::create(['arena_id' => 2, 'time_slot' => '19:00-20:00', 'price' => 750.00]);
        
        Pricing::create(['arena_id' => 3, 'time_slot' => '18:00-19:00', 'price' => 900.00]);
    }
}
