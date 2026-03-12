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
        Schema::create('slot_locks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arena_id')->constrained('arenas')->onDelete('cascade');
            $table->date('booking_date');
            $table->string('time_slot', 20);
            $table->string('session_id', 128)->index();
            $table->timestamp('locked_at')->useCurrent();
            $table->timestamp('expires_at')->index();

            $table->unique(['arena_id', 'booking_date', 'time_slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('slot_locks');
    }
};
