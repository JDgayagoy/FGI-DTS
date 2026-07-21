<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ShipmentDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $shipmentIds = range(1, 10);
        $customDocIds = range(1, 11);

        $rows = [];
        foreach ($shipmentIds as $shipmentId) {
            foreach ($customDocIds as $docId) {
                $rows[] = [
                    'shipment_id'   => $shipmentId,
                    'custom_doc_id' => $docId,
                ];
            }
        }

        DB::table('shipment_documents')->insert($rows);
    }
}