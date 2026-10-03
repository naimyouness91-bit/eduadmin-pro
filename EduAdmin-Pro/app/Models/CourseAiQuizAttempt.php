<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseAiQuizAttempt extends Model
{
    protected $fillable = [
        'quiz_id',
        'student_id',
        'score',
        'max_score',
        'percentage',
        'submitted_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'max_score' => 'integer',
        'percentage' => 'float',
        'submitted_at' => 'datetime',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(CourseAiQuiz::class, 'quiz_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(CourseAiQuizAttemptAnswer::class, 'attempt_id');
    }
}
