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
        Schema::create('pricings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arena_id')->constrained('arenas')->onDelete('cascade')->onUpdate('cascade');
            $table->string('time_slot', 20);
            $table->decimal('price', 10, 2);
            $table->integer('day_of_week')->nullable(); // 0 = Sunday, 6 = Saturday
            $table->timestamps();

            $table->unique(['arena_id', 'time_slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pricings');
    }
};
