<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ClassSection extends Model
{
    protected $fillable = [
        'grade_level',
        'section',
        'label',
        'academic_year',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function timetables(): HasMany
    {
        return $this->hasMany(Timetable::class);
    }

    public function publishedTimetable(): HasOne
    {
        return $this->hasOne(Timetable::class)->where('is_published', true)->latestOfMany();
    }

    public static function resolveForStudent(Student $student): ?self
    {
        $grade = trim((string) $student->grade_level);
        $section = trim((string) $student->section);

        if ($grade === '' || $section === '') {
            return null;
        }

        return static::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(TRIM(grade_level)) = ?', [strtolower($grade)])
            ->whereRaw('LOWER(TRIM(section)) = ?', [strtolower($section)])
            ->orderByDesc('id')
            ->first();
    }

    public static function labelFor(string $gradeLevel, string $section): string
    {
        return trim("{$gradeLevel} {$section}");
    }
}
