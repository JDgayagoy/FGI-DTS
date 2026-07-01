<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('permissions')
            ->where('name', 'delete_shipments')
            ->update([
                'name' => 'archive_shipments',
                'action' => 'archive',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('permissions')
            ->where('name', 'archive_shipments')
            ->update([
                'name' => 'delete_shipments',
                'action' => 'delete',
            ]);
    }
};
