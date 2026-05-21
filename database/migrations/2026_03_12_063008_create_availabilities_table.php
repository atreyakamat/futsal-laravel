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
        Schema::create('availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arena_id')->constrained('arenas')->onDelete('cascade')->onUpdate('cascade');
            $table->date('booking_date');
            $table->string('time_slot', 20);
            $table->boolean('is_available')->default(1);
            $table->timestamps();

            $table->unique(['arena_id', 'booking_date', 'time_slot']);
            $table->index('booking_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('availabilities');
    }
};
