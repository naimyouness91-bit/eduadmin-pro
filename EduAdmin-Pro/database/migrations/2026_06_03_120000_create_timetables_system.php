<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_sections', function (Blueprint $table) {
            $table->id();
            $table->string('grade_level');
            $table->string('section', 16);
            $table->string('label');
            $table->string('academic_year')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['grade_level', 'section', 'academic_year'], 'class_sections_unique');
        });

        Schema::create('timetables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_section_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('academic_year')->nullable();
            $table->string('semester')->nullable();
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['class_section_id', 'is_published']);
        });

        Schema::create('timetable_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timetable_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 1=Mon … 6=Sat
            $table->time('start_time');
            $table->time('end_time');
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained()->nullOnDelete();
            $table->string('room')->nullable();
            $table->timestamps();

            $table->unique(
                ['timetable_id', 'day_of_week', 'start_time', 'end_time'],
                'timetable_slot_unique'
            );
            $table->index(['teacher_id', 'day_of_week', 'start_time']);
            $table->index(['room', 'day_of_week', 'start_time']);
        });

        Schema::table('courses', function (Blueprint $table) {
            if (! Schema::hasColumn('courses', 'section')) {
                $table->string('section', 16)->nullable()->after('grade_level');
            }
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            if (Schema::hasColumn('courses', 'section')) {
                $table->dropColumn('section');
            }
        });

        Schema::dropIfExists('timetable_entries');
        Schema::dropIfExists('timetables');
        Schema::dropIfExists('class_sections');
    }
};
