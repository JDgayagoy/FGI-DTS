<?php

namespace Database\Seeders;

use App\Models\Broker;
use App\Models\ShipmentStatusList;
use App\Models\ShipmentType;
use Illuminate\Database\Seeder;

class ShipmentSeeder extends Seeder
{
    public function run(): void
    {
        $processing = ShipmentStatusList::where('status_name', 'Processing')->first();
        $completed = ShipmentStatusList::where('status_name', 'Completed')->first();
        $pending = ShipmentStatusList::where('status_name', 'Pending')->first();
        $failed = ShipmentStatusList::where('status_name', 'Failed')->first();

        $sea = ShipmentType::where('shipment_type_name', 'Sea')->first();
        $air = ShipmentType::where('shipment_type_name', 'Air')->first();
        $land = ShipmentType::where('shipment_type_name', 'Land')->first();

        $grab = Broker::where('broker_name', 'Grab Philippines')->first();
        $lalancove = Broker::where('broker_name', 'Lalancove')->first();
        $angkas = Broker::where('broker_name', 'Angkas')->first();
        $movelt = Broker::where('broker_name', 'Movelt')->first();
        $joyride = Broker::where('broker_name', 'Joyride')->first();
        $lbc = Broker::where('broker_name', 'LBC')->first();

    }
}
