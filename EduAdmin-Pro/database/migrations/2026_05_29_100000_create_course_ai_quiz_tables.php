<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_quiz_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->string('original_filename');
            $table->string('disk_path');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->longText('extracted_text')->nullable();
            $table->string('extraction_status', 20)->default('pending');
            $table->text('extraction_error')->nullable();
            $table->timestamps();

            $table->index(['teacher_id', 'created_at']);
        });

        Schema::create('course_ai_quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('course_quiz_documents')->nullOnDelete();
            $table->string('title');
            $table->string('difficulty', 20);
            $table->unsignedSmallInteger('question_count');
            $table->json('question_types');
            $table->string('status', 20)->default('draft');
            $table->string('ai_provider', 40)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['course_id', 'status']);
        });

        Schema::create('course_ai_quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('course_ai_quizzes')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('type', 30);
            $table->text('question');
            $table->json('options')->nullable();
            $table->text('correct_answer');
            $table->text('explanation')->nullable();
            $table->unsignedSmallInteger('points')->default(1);
            $table->timestamps();
        });

        Schema::create('course_ai_quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('course_ai_quizzes')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('score')->default(0);
            $table->unsignedSmallInteger('max_score')->default(0);
            $table->decimal('percentage', 5, 2)->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['quiz_id', 'student_id']);
        });

        Schema::create('course_ai_quiz_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('course_ai_quiz_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('course_ai_quiz_questions')->cascadeOnDelete();
            $table->text('answer')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->unsignedSmallInteger('points_earned')->default(0);
            $table->timestamps();

            $table->unique(['attempt_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_ai_quiz_attempt_answers');
        Schema::dropIfExists('course_ai_quiz_attempts');
        Schema::dropIfExists('course_ai_quiz_questions');
        Schema::dropIfExists('course_ai_quizzes');
        Schema::dropIfExists('course_quiz_documents');
    }
};
