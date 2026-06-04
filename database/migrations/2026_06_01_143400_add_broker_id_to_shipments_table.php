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
        Schema::table('shipments', function (Blueprint $table) {
            $table->unsignedBigInteger('broker_id')->nullable()->after('actual_time_of_arrival');
        });

        // Migrate data
        $uniqueBrokers = DB::table('shipments')
            ->whereNotNull('broker')
            ->where('broker', '!=', '')
            ->distinct()
            ->pluck('broker');

        foreach ($uniqueBrokers as $name) {
            $brokerId = DB::table('brokers')
                ->where('broker_name', $name)
                ->value('broker_id');

            if (! $brokerId) {
                $brokerId = DB::table('brokers')->insertGetId([
                    'broker_name' => $name,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('shipments')
                ->where('broker', $name)
                ->update(['broker_id' => $brokerId]);
        }

        Schema::table('shipments', function (Blueprint $table) {
            $table->foreign('broker_id')->references('broker_id')->on('brokers')->onDelete('set null');
            $table->dropColumn('broker');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('broker')->nullable()->after('actual_time_of_arrival');
        });

        // Restore data
        $shipments = DB::table('shipments')
            ->whereNotNull('broker_id')
            ->join('brokers', 'shipments.broker_id', '=', 'brokers.broker_id')
            ->select('shipments.shipment_id', 'brokers.broker_name')
            ->get();

        foreach ($shipments as $s) {
            DB::table('shipments')
                ->where('shipment_id', $s->shipment_id)
                ->update(['broker' => $s->broker_name]);
        }

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['broker_id']);
            $table->dropColumn('broker_id');
        });
    }
};
