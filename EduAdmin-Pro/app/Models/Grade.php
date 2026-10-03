<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'student_id',
        'course_id',
        'teacher_id',
        'type',
        'title',
        'score',
        'max_score',
        'weight',
        'graded_at',
        'semester',
        'academic_year',
        'feedback',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'score' => 'decimal:2',
        'max_score' => 'decimal:2',
        'weight' => 'decimal:2',
        'graded_at' => 'date',
    ];

    /**
     * @var array<int, string>
     */
    protected $appends = [
        'percentage',
        'letter_grade',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function getPercentageAttribute(): ?float
    {
        if ($this->score === null) {
            return null;
        }

        $maxScore = (float) $this->max_score;

        if ($maxScore <= 0) {
            return null;
        }

        return round(((float) $this->score / $maxScore) * 100, 2);
    }

    public function getLetterGradeAttribute(): ?string
    {
        $percentage = $this->percentage;

        if ($percentage === null) {
            return null;
        }

        return match (true) {
            $percentage >= 97 => 'A+',
            $percentage >= 93 => 'A',
            $percentage >= 87 => 'B+',
            $percentage >= 83 => 'B',
            $percentage >= 77 => 'C+',
            $percentage >= 73 => 'C',
            $percentage >= 60 => 'D',
            default => 'F',
        };
    }
}
