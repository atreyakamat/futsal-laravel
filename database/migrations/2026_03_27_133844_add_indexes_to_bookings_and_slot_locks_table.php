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
        Schema::table('bookings', function (Blueprint $table) {
            $table->index(['arena_id', 'booking_date', 'time_slot', 'payment_status'], 'idx_arena_date_slot_status');
        });

        Schema::table('slot_locks', function (Blueprint $table) {
            $table->index(['arena_id', 'booking_date', 'time_slot', 'expires_at'], 'idx_arena_date_slot_expiry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('idx_arena_date_slot_status');
        });

        Schema::table('slot_locks', function (Blueprint $table) {
            $table->dropIndex('idx_arena_date_slot_expiry');
        });
    }
};
