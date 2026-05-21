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
        Schema::create('admins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arena_id')->nullable()->constrained('arenas')->onDelete('cascade')->onUpdate('cascade');
            $table->string('username', 50)->unique();
            $table->string('password', 255);
            $table->string('name', 100)->nullable();
            $table->string('email', 100)->nullable();
            $table->enum('role', ['super_admin', 'owner', 'admin', 'manager', 'staff', 'security'])->default('admin');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admins');
    }
};
