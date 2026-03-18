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
        // User::factory(10)->create();

        \App\Models\User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
            ]
        );

        $mapusa = Arena::updateOrCreate(
            ['id' => 1],
            [
                'name' => 'Agnel Futsal Arena',
                'slug' => 'agnel-futsal',
                'address' => 'Pilar, Goa 403203',
                'gmaps_link' => 'https://maps.app.goo.gl/agnel-futsal-pilar',
                'contact_phone' => '919876543210',
                'status' => 'active',
                'bot_enabled' => true
            ]
        );

        $assagao = Arena::updateOrCreate(
            ['id' => 2],
            [
                'name' => 'Assagao Sports Complex',
                'slug' => 'assagao-futsal',
                'address' => 'Main Road, Assagao, Bardez, Goa 403507',
                'gmaps_link' => 'https://maps.app.goo.gl/assagao-sports',
                'contact_phone' => '919876543211',
                'status' => 'active',
                'bot_enabled' => true
            ]
        );

        $panjim = Arena::updateOrCreate(
            ['id' => 3],
            [
                'name' => 'Panjim Central Arena',
                'slug' => 'panjim-futsal',
                'address' => 'Near Miramar Beach, Panaji, Goa 403001',
                'gmaps_link' => 'https://maps.app.goo.gl/panjim-central',
                'contact_phone' => '919876543212',
                'status' => 'active',
                'bot_enabled' => true
            ]
        );

        // Add some pricing
        Pricing::updateOrCreate(['arena_id' => 1, 'time_slot' => '18:00-19:00'], ['price' => 800.00]);
        Pricing::updateOrCreate(['arena_id' => 1, 'time_slot' => '19:00-20:00'], ['price' => 800.00]);
        Pricing::updateOrCreate(['arena_id' => 1, 'time_slot' => '20:00-21:00'], ['price' => 1000.00]);

        Pricing::updateOrCreate(['arena_id' => 2, 'time_slot' => '18:00-19:00'], ['price' => 750.00]);
        Pricing::updateOrCreate(['arena_id' => 2, 'time_slot' => '19:00-20:00'], ['price' => 750.00]);

        Pricing::updateOrCreate(['arena_id' => 3, 'time_slot' => '18:00-19:00'], ['price' => 900.00]);

        \App\Models\Setting::updateOrCreate(
            ['key' => 'global_ai_enabled'],
            ['value' => 'true']
        );
    }
}
