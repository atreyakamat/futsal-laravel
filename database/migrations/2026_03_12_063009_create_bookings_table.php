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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 20)->nullable()->index();
            $table->string('booking_ref', 30)->nullable()->index();
            $table->foreignId('arena_id')->constrained('arenas')->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->onUpdate('cascade');
            $table->date('booking_date')->index();
            $table->string('time_slot', 20);
            $table->string('customer_name', 100);
            $table->string('customer_mobile', 15)->index();
            $table->string('customer_email', 100)->nullable();
            $table->decimal('amount', 10, 2);
            $table->enum('payment_status', ['pending', 'confirmed', 'failed', 'cancelled'])->default('pending')->index();
            $table->enum('payment_method', ['online', 'cash', 'upi'])->default('online');
            $table->string('transaction_id', 100)->nullable();
            $table->string('payu_order_id', 100)->nullable();
            $table->string('payu_mihpayid', 100)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('checked_in')->default(0);
            $table->dateTime('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('admins')->onDelete('set null');
            $table->foreignId('booked_by_admin')->nullable()->constrained('admins')->onDelete('set null');
            $table->boolean('is_free_booking')->default(0);
            $table->timestamps();

            $table->unique(['arena_id', 'booking_date', 'time_slot']);
            $table->index(['arena_id', 'booking_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
