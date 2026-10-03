<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'student_id',
        'grade_level',
        'section',
        'enrollment_status',
        'is_scholarship',
        'enrollment_date',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
        'blood_group',
        'medical_notes',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'enrollment_date' => 'date',
        'is_scholarship' => 'boolean',
    ];

    /**
     * @var array<int, string>
     */
    protected $appends = [
        'average_grade',
        'attendance_rate',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_student')
            ->withPivot(['status', 'enrolled_at'])
            ->withTimestamps();
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function absences(): HasMany
    {
        return $this->hasMany(Absence::class);
    }

    public function parents(): BelongsToMany
    {
        return $this->belongsToMany(ParentModel::class, 'parent_student', 'student_id', 'parent_id')
            ->withPivot(['relationship', 'is_primary'])
            ->withTimestamps();
    }

    public function bulletin(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(StudentBulletin::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getAverageGradeAttribute(): ?float
    {
        $grades = $this->grades()->whereNotNull('score')->get();

        if ($grades->isEmpty()) {
            return null;
        }

        $weightedSum = 0;
        $totalWeight = 0;

        foreach ($grades as $grade) {
            $maxScore = (float) $grade->max_score;

            if ($maxScore <= 0) {
                continue;
            }

            $percentage = ((float) $grade->score / $maxScore) * 100;
            $weight = (float) $grade->weight;

            $weightedSum += $percentage * $weight;
            $totalWeight += $weight;
        }

        if ($totalWeight <= 0) {
            return null;
        }

        return round($weightedSum / $totalWeight, 2);
    }

    public function getAttendanceRateAttribute(): float
    {
        $total = $this->absences()->count();

        if ($total === 0) {
            return 100.0;
        }

        $absent = $this->absences()->where('status', 'absent')->count();

        return round((($total - $absent) / $total) * 100, 2);
    }
}
