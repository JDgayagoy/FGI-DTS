<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Define initial users
        $users = [
            [
                'name' => 'Supply Chain Admin',
                'email' => 'admin@example.com',
                'password' => Hash::make('password'),
                'role' => 'Supply chain manager',
            ],
            [
                'name' => 'Logis Associate',
                'email' => 'logis@example.com',
                'password' => Hash::make('password'),
                'role' => 'Logis Assoc',
            ],
            [
                'name' => 'Brand Manager',
                'email' => 'brand@example.com',
                'password' => Hash::make('password'),
                'role' => 'Brand manager',
            ],
        ];

        foreach ($users as $userData) {
            $roleName = $userData['role'];
            unset($userData['role']);

            $user = User::firstOrCreate(['email' => $userData['email']], $userData);

            $role = Role::where('role_name', $roleName)->first();
            if ($role) {
                $user->roles()->syncWithoutDetaching([$role->role_id]);
            }
        }
    }
}
