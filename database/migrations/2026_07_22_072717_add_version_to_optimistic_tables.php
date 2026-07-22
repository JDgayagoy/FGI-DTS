<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tables = [
            'shipments',
            'brokers',
            'users',
            'custom_docs',
            'shipment_documents',
            'document_statuses',
            'user_imap_settings',
            'shipment_emails',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->integer('version')->default(1);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'shipments',
            'brokers',
            'users',
            'custom_docs',
            'shipment_documents',
            'document_statuses',
            'user_imap_settings',
            'shipment_emails',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('version');
            });
        }
    }
};
