<?php

namespace Database\Seeders;

use App\Models\DocumentStatusList;
use Illuminate\Database\Seeder;

class DocumentStatusListSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            ['status_name' => 'Approved'],
            ['status_name' => 'Pending'],
            ['status_name' => 'Rejected'],
        ];

        foreach ($statuses as $status) {
            DocumentStatusList::create($status);
        }
    }
}
