<?php

namespace Database\Seeders;

use App\Models\Broker;
use Illuminate\Database\Seeder;

class BrokerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brokers = [
            [
                'broker_name' => 'Grab Philippines',
                'contact_person' => 'Juan Dela Cruz',
                'email' => 'grab.ph@example.com',
                'phone' => '09171234567',
                'is_active' => true,
            ],
            [
                'broker_name' => 'Lalancove',
                'contact_person' => 'Maria Santos',
                'email' => 'lalancove@example.com',
                'phone' => '09187654321',
                'is_active' => true,
            ],
            [
                'broker_name' => 'Angkas',
                'contact_person' => 'Pedro Penduko',
                'email' => 'angkas@example.com',
                'phone' => '09191112222',
                'is_active' => true,
            ],
            [
                'broker_name' => 'Movelt',
                'contact_person' => 'Ana Dimagiba',
                'email' => 'movelt@example.com',
                'phone' => '09203334444',
                'is_active' => true,
            ],
            [
                'broker_name' => 'Joyride',
                'contact_person' => 'Jose Rizal',
                'email' => 'joyride@example.com',
                'phone' => '09215556666',
                'is_active' => true,
            ],
            [
                'broker_name' => 'LBC',
                'contact_person' => 'Andres Bonifacio',
                'email' => 'lbc@example.com',
                'phone' => '09227778888',
                'is_active' => true,
            ],
        ];

        foreach ($brokers as $broker) {
            Broker::firstOrCreate(['broker_name' => $broker['broker_name']], $broker);
        }
    }
}
