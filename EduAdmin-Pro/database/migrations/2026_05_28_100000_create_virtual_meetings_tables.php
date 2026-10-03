<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('virtual_meetings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('jitsi_room_name')->unique();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('status', 20)->default('scheduled');
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'scheduled_at']);
        });

        Schema::create('meeting_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('virtual_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('participant');
            $table->boolean('hand_raised')->default(false);
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->unsignedInteger('total_duration_seconds')->default(0);
            $table->timestamps();

            $table->unique(['virtual_meeting_id', 'user_id']);
        });

        Schema::create('meeting_attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('virtual_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('joined_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->index(['virtual_meeting_id', 'user_id']);
        });

        Schema::create('meeting_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('virtual_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('chat');
            $table->text('content');
            $table->timestamps();

            $table->index(['virtual_meeting_id', 'created_at']);
        });

        Schema::create('meeting_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('virtual_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('file_name');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_resources');
        Schema::dropIfExists('meeting_messages');
        Schema::dropIfExists('meeting_attendance_logs');
        Schema::dropIfExists('meeting_participants');
        Schema::dropIfExists('virtual_meetings');
    }
};
