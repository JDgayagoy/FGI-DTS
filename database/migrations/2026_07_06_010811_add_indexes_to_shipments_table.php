<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Foreign-key-style lookups (joins used in the controller)
            $table->index('status_id');
            $table->index('broker_id');
            $table->index('shipment_type_id');

            // Used in scopeActive() / scopeArchived() and the archive filter
            $table->index('archived_at');

            // Default sort column, and a sortable column
            $table->index('created_at');

            // Sortable + frequently searched
            $table->index('shipment_reference');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropIndex(['status_id']);
            $table->dropIndex(['broker_id']);
            $table->dropIndex(['shipment_type_id']);
            $table->dropIndex(['archived_at']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['shipment_reference']);
        });
    }
};