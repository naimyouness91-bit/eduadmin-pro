<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('timetable_entries', function (Blueprint $table) {
            $table->string('session_status', 20)->default('scheduled')->after('notes');
        });

        Schema::create('timetable_reschedule_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timetable_entry_id')->constrained('timetable_entries')->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->text('reason')->nullable();
            $table->unsignedTinyInteger('original_day_of_week');
            $table->string('original_start_time', 5);
            $table->string('original_end_time', 5);
            $table->unsignedTinyInteger('proposed_day_of_week');
            $table->string('proposed_start_time', 5);
            $table->string('proposed_end_time', 5);
            $table->string('proposed_room')->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_reschedule_requests');

        Schema::table('timetable_entries', function (Blueprint $table) {
            $table->dropColumn('session_status');
        });
    }
};
