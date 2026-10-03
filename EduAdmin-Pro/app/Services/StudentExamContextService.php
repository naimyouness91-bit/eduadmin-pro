<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\Student;
use Illuminate\Support\Collection;

class StudentExamContextService
{
    /**
     * @return array<string, mixed>
     */
    public function buildContext(Student $student): array
    {
        $student->loadMissing(['user', 'courses']);

        $grades = Grade::query()
            ->where('student_id', $student->id)
            ->with('course')
            ->latest('graded_at')
            ->get();

        return [
            'student_name' => $student->user?->name ?? 'Student',
            'grade_level' => $student->grade_level,
            'courses' => $student->courses->pluck('name')->filter()->values()->all(),
            'average_grade' => $student->average_grade,
            'attendance_rate' => $student->attendance_rate,
            'weak_subjects' => $this->weakSubjects($student, $grades),
            'recent_grades' => $grades->take(15)->map(fn (Grade $g) => [
                'course' => $g->course?->name,
                'title' => $g->title,
                'type' => $g->type,
                'score' => $g->score,
                'max_score' => $g->max_score,
                'percentage' => $g->max_score > 0
                    ? round(((float) $g->score / (float) $g->max_score) * 100, 1)
                    : null,
            ])->all(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function weakSubjects(Student $student, ?Collection $grades = null): array
    {
        if ($grades === null) {
            $grades = Grade::query()
                ->where('student_id', $student->id)
                ->with('course')
                ->get();
        }

        $byCourse = [];

        foreach ($grades as $grade) {
            $courseName = $grade->course?->name ?? 'General';
            $max = (float) $grade->max_score;

            if ($max <= 0 || $grade->score === null) {
                continue;
            }

            $pct = ((float) $grade->score / $max) * 100;

            if (! isset($byCourse[$courseName])) {
                $byCourse[$courseName] = ['total' => 0, 'count' => 0];
            }

            $byCourse[$courseName]['total'] += $pct;
            $byCourse[$courseName]['count']++;
        }

        $weak = [];

        foreach ($byCourse as $course => $stats) {
            $avg = $stats['total'] / $stats['count'];
            if ($avg < 75) {
                $weak[] = [
                    'course' => $course,
                    'average_percentage' => round($avg, 1),
                    'priority' => $avg < 60 ? 'high' : 'medium',
                ];
            }
        }

        usort($weak, fn ($a, $b) => $a['average_percentage'] <=> $b['average_percentage']);

        return $weak;
    }
}
