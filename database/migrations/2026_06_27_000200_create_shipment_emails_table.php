<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('shipment_id')->nullable();
            $table->foreign('shipment_id')->references('shipment_id')->on('shipments')->nullOnDelete();
            $table->string('imap_message_uid');
            $table->string('from_address');
            $table->string('from_name')->nullable();
            $table->string('subject');
            $table->text('body_excerpt');
            $table->string('matched_ref')->nullable();
            $table->enum('action_taken', [
                'matched', 'pending_review', 'dismissed', 'shipment_created', 'skipped',
            ]);
            $table->timestamp('received_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'imap_message_uid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_emails');
    }
};
