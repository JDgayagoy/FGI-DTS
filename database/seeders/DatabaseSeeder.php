<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ShipmentStatusListSeeder::class,
            DocumentStatusListSeeder::class,
            CustomDocSeeder::class,
            ShipmentTypeSeeder::class,
            ShipmentSeeder::class,
            ShipmentDocumentSeeder::class, // add this
            DocumentStatusSeeder::class,
            RolesAndPermissionsSeeder::class,
            UserSeeder::class,
        ]);
    }
}
