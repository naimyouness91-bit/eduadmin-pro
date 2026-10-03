<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseAiQuizQuestion extends Model
{
    public const TYPE_MCQ = 'mcq';

    public const TYPE_TRUE_FALSE = 'true_false';

    public const TYPE_SHORT_ANSWER = 'short_answer';

    protected $fillable = [
        'quiz_id',
        'sort_order',
        'type',
        'question',
        'options',
        'correct_answer',
        'explanation',
        'points',
    ];

    protected $casts = [
        'options' => 'array',
        'sort_order' => 'integer',
        'points' => 'integer',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(CourseAiQuiz::class, 'quiz_id');
    }
}
