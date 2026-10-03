<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseQuizDocument extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'course_id',
        'teacher_id',
        'original_filename',
        'disk_path',
        'mime_type',
        'file_size',
        'extracted_text',
        'extraction_status',
        'extraction_error',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(CourseAiQuiz::class, 'document_id');
    }
}
