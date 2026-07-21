<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ShipmentTypeSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('shipment_types')->insert([
            ['shipment_type_name' => 'Sea'],
            ['shipment_type_name' => 'Air'],
            ['shipment_type_name' => 'Land'],
        ]);
    }
}