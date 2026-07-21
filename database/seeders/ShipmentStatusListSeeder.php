<?php

namespace Database\Seeders;

use App\Models\ShipmentStatusList;
use Illuminate\Database\Seeder;

class ShipmentStatusListSeeder extends Seeder
{
  /**
   * Run the database seeds.
   */
  public function run(): void
  {
    $statuses = [
      ['status_name' => 'Processing'],
      ['status_name' => 'Pending'],
      ['status_name' => 'Failed'],
      ['status_name' => 'Completed'],
    ];

    foreach ($statuses as $status) {
      ShipmentStatusList::create($status);
    }
  }
}
