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
            $table->dropForeign(['checked_in_by']);
            $table->dropForeign(['booked_by_admin']);
            
            $table->foreign('checked_in_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('booked_by_admin')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['checked_in_by']);
            $table->dropForeign(['booked_by_admin']);
            
            $table->foreign('checked_in_by')->references('id')->on('admins')->onDelete('set null');
            $table->foreign('booked_by_admin')->references('id')->on('admins')->onDelete('set null');
        });
    }
};
