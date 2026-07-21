<?php

namespace Database\Seeders;

use App\Models\CustomDoc;
use Illuminate\Database\Seeder;

class CustomDocSeeder extends Seeder
{
  /**
   * Run the database seeds.
   */
  public function run(): void
{
    $docs = [
        ['doc_name' => 'SH',   'doc_full_name' => 'Shipment Header'],
        ['doc_name' => 'SSDT', 'doc_full_name' => 'Single Sheet Document Transfer'],
        ['doc_name' => 'FAN',  'doc_full_name' => 'Freight Arrival Notice'],
        ['doc_name' => 'TAN',  'doc_full_name' => 'Tax Arrival Notice'],
        ['doc_name' => 'SAD',  'doc_full_name' => 'Single Administrative Document'],
        ['doc_name' => 'BL',   'doc_full_name' => 'Bill of Lading'],
        ['doc_name' => 'FE',   'doc_full_name' => 'Foreign Exchange'],
        ['doc_name' => 'IV',   'doc_full_name' => 'Invoice'],
        ['doc_name' => 'PL',   'doc_full_name' => 'Packing List'],
        ['doc_name' => 'CI',   'doc_full_name' => 'Commercial Invoice'],
        ['doc_name' => 'DH',   'doc_full_name' => 'Delivery Header'],
    ];

    foreach ($docs as $doc) {
        CustomDoc::create($doc);
    }
}
}
