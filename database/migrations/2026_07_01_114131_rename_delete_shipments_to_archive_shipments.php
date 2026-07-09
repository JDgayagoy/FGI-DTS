<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('permissions')
            ->where('name', 'delete-shipments')
            ->update([
                'name' => 'archive-shipments',
                'action' => 'archive',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('permissions')
            ->where('name', 'archive-shipments')
            ->update([
                'name' => 'delete-shipments',
                'action' => 'delete',
            ]);
    }
};
