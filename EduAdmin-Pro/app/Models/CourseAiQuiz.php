<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CourseAiQuiz extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const DIFFICULTY_EASY = 'easy';

    public const DIFFICULTY_MEDIUM = 'medium';

    public const DIFFICULTY_HARD = 'hard';

    protected $fillable = [
        'course_id',
        'teacher_id',
        'document_id',
        'title',
        'difficulty',
        'question_count',
        'question_types',
        'status',
        'ai_provider',
        'published_at',
    ];

    protected $casts = [
        'question_types' => 'array',
        'question_count' => 'integer',
        'published_at' => 'datetime',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(CourseQuizDocument::class, 'document_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(CourseAiQuizQuestion::class, 'quiz_id')->orderBy('sort_order');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(CourseAiQuizAttempt::class, 'quiz_id');
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }
}
