<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('filename');
            $table->string('disk')->default('backups');
            $table->string('path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('database_driver', 20);
            $table->boolean('includes_files')->default(true);
            $table->string('checksum', 64)->nullable();
            $table->string('status', 20)->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_backups');
    }
};
