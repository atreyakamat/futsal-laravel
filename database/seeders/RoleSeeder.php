<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::updateOrCreate(
            ['email' => 'superadmin@futsalgoa.com'],
            [
                'name' => 'Super Admin',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => 'super_admin'
            ]
        );

        \App\Models\User::updateOrCreate(
            ['email' => 'admin@futsalgoa.com'],
            [
                'name' => 'Admin',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => 'admin'
            ]
        );

        \App\Models\User::updateOrCreate(
            ['email' => 'security@futsalgoa.com'],
            [
                'name' => 'Security',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => 'security'
            ]
        );
    }
}
