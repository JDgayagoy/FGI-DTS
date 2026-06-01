<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\ShipmentStatusList;
use App\Models\ShipmentType;
use Illuminate\Database\Seeder;

class ShipmentSeeder extends Seeder
{
    public function run(): void
    {
        $processing  = ShipmentStatusList::where('status_name', 'Processing')->first();
        $completed = ShipmentStatusList::where('status_name', 'Completed')->first();
        $pending   = ShipmentStatusList::where('status_name', 'Pending')->first();
        $failed  = ShipmentStatusList::where('status_name', 'Failed')->first();

        $sea  = ShipmentType::where('shipment_type_name', 'Sea')->first();
        $air  = ShipmentType::where('shipment_type_name', 'Air')->first();
        $land = ShipmentType::where('shipment_type_name', 'Land')->first();

        $shipments = [
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-488',
                'brand'                  => 'Brumate',
                'incoterm'               => 'EXW',
                'actual_time_of_arrival' => '2003-09-25',
                'broker'                 => 'Grab Philippines',
                'brand_manager'          => 'Matthew Andre Corral',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-489',
                'brand'                  => 'Fendi Casa',
                'incoterm'               => 'FCA',
                'actual_time_of_arrival' => '2003-12-20',
                'broker'                 => 'Lalancove',
                'brand_manager'          => 'Shannen Salvatera',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-490',
                'brand'                  => 'Hunter Douglas',
                'incoterm'               => 'FCA',
                'actual_time_of_arrival' => '2003-05-27',
                'broker'                 => 'Angkas',
                'brand_manager'          => 'Terrenz Cubacub',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-491',
                'brand'                  => 'TechnoGym',
                'incoterm'               => 'EXW',
                'actual_time_of_arrival' => '2002-05-23',
                'broker'                 => 'Movelt',
                'brand_manager'          => 'Gavin Lorenzo Castro',
                'shipment_type_id'       => $air->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-492',
                'brand'                  => 'Philips Personal Care',
                'incoterm'               => 'FOB',
                'actual_time_of_arrival' => '2003-12-22',
                'broker'                 => 'Joyride',
                'brand_manager'          => 'Jaslein Zynah Dueñas',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-493',
                'brand'                  => 'Villeroy & Boch',
                'incoterm'               => 'FCA',
                'actual_time_of_arrival' => '2004-04-28',
                'broker'                 => 'Grab Philippines',
                'brand_manager'          => 'Christian Jerard Abella',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-494',
                'brand'                  => 'B&B Italia',
                'incoterm'               => 'FOB',
                'actual_time_of_arrival' => '2004-04-04',
                'broker'                 => 'Joyride',
                'brand_manager'          => 'Angela Luisse Briones',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-495',
                'brand'                  => 'DMC',
                'incoterm'               => 'EXW',
                'actual_time_of_arrival' => '2004-04-17',
                'broker'                 => 'LBC',
                'brand_manager'          => 'Reich Alexandria Balubal',
                'shipment_type_id'       => $land->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-496',
                'brand'                  => 'Boffi',
                'incoterm'               => 'EXW',
                'actual_time_of_arrival' => '2003-12-29',
                'broker'                 => 'Movelt',
                'brand_manager'          => 'Anvil Dumaual',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'year'                   => 2025,
                'month'                  => 4,
                'shipment_reference'     => '2025-SKDEVAN-497',
                'brand'                  => 'Philips Personal Care',
                'incoterm'               => 'EXW',
                'actual_time_of_arrival' => '2004-05-11',
                'broker'                 => 'Grab Philippines',
                'brand_manager'          => 'XXXXXXXX',
                'shipment_type_id'       => $sea->shipment_type_id,
                'status_id'              => $pending->status_id,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
        ];

        foreach ($shipments as $shipment) {
            Shipment::create($shipment);
        }
    }
}