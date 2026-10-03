<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Grade;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GradeService
{
    /**
     * Seed realistic demo grades when the table is empty (e.g. fresh install without full seeder).
     *
     * @return int Number of grades created
     */
    public function seedDemoGradesIfEmpty(): int
    {
        if (Grade::query()->exists()) {
            return 0;
        }

        $students = Student::query()->with('user')->get();
        $courses = Course::query()->with('teacher')->get();

        if ($students->isEmpty() || $courses->isEmpty()) {
            return 0;
        }

        $types = ['exam', 'quiz', 'homework', 'project'];
        $startDate = now()->subMonths(3);
        $created = 0;

        foreach ($students as $student) {
            foreach ($courses as $course) {
                if (! $course->students()->where('students.id', $student->id)->exists()) {
                    continue;
                }

                foreach ($types as $type) {
                    $score = $this->realisticDemoScore($student->user?->name ?? 'Student', $course->code);
                    Grade::create([
                        'student_id' => $student->id,
                        'course_id' => $course->id,
                        'teacher_id' => $course->teacher_id,
                        'type' => $type,
                        'title' => ucfirst($type).' — '.$course->name,
                        'score' => $score,
                        'max_score' => 100,
                        'weight' => match ($type) {
                            'exam' => 2,
                            'project' => 1.5,
                            default => 1,
                        },
                        'graded_at' => $startDate->copy()->addDays(rand(5, 80))->toDateString(),
                        'semester' => $course->semester ?? 'Spring 2025',
                        'academic_year' => $course->academic_year ?? '2024-2025',
                        'feedback' => $score >= 70
                            ? 'Excellent travail, continuez ainsi.'
                            : 'Révisez les points faibles et demandez de l\'aide si nécessaire.',
                    ]);
                    $created++;
                }
            }
        }

        return $created;
    }

    public function scopedGradeQuery(?User $user): Builder
    {
        $query = Grade::query();

        if ($user?->isStudent()) {
            if (! $user->student) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where('student_id', $user->student->id);
        }

        if ($user?->isParent()) {
            $parent = $user->parent()->first();
            if (! $parent) {
                return $query->whereRaw('1 = 0');
            }

            $childIds = $parent->students()->pluck('students.id');

            return $query->whereIn('student_id', $childIds);
        }

        if ($user?->isTeacher() && $user->teacher) {
            $teacherId = $user->teacher->id;

            return $query->where(function (Builder $q) use ($teacherId) {
                $q->where('teacher_id', $teacherId)
                    ->orWhereHas('course', fn (Builder $cq) => $cq->where('teacher_id', $teacherId));
            });
        }

        return $query;
    }

    public function applyGradeFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->query('student_id'));
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->query('course_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('student.user', function (Builder $uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('course', function (Builder $cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }

    /**
     * @return array{total: int, average: float, exams: int, quizzes: int, homework: int, projects: int}
     */
    public function gradeStats(?User $user, Request $request): array
    {
        $query = $this->applyGradeFilters($this->scopedGradeQuery($user), $request);

        $percentages = (clone $query)
            ->whereNotNull('score')
            ->where('max_score', '>', 0)
            ->get(['score', 'max_score'])
            ->map(fn (Grade $grade) => ((float) $grade->score / (float) $grade->max_score) * 100);

        return [
            'total' => (clone $query)->count(),
            'average' => $percentages->isNotEmpty() ? round($percentages->avg(), 1) : 0.0,
            'exams' => (clone $query)->where('type', 'exam')->count(),
            'quizzes' => (clone $query)->where('type', 'quiz')->count(),
            'homework' => (clone $query)->where('type', 'homework')->count(),
            'projects' => (clone $query)->where('type', 'project')->count(),
        ];
    }

    protected function realisticDemoScore(string $studentName, string $courseCode): float
    {
        $base = crc32($studentName.$courseCode) % 8;

        return min(20, max(8, 11 + $base + (rand(0, 30) / 10))) * 5;
    }

    /**
     * @return array<int, Grade>
     */
    public function bulkGrade(int $courseId, array $grades, array $meta): array
    {
        return DB::transaction(function () use ($courseId, $grades, $meta) {
            $created = [];

            foreach ($grades as $entry) {
                $created[] = Grade::create([
                    'student_id' => $entry['student_id'],
                    'course_id' => $courseId,
                    'teacher_id' => $meta['teacher_id'] ?? $entry['teacher_id'] ?? null,
                    'type' => $entry['type'] ?? $meta['type'] ?? 'exam',
                    'title' => $entry['title'] ?? $meta['title'] ?? 'Grade',
                    'score' => $entry['score'],
                    'max_score' => $entry['max_score'] ?? $meta['max_score'] ?? 100,
                    'weight' => $entry['weight'] ?? $meta['weight'] ?? 1,
                    'graded_at' => $entry['graded_at'] ?? $meta['graded_at'] ?? now()->toDateString(),
                    'semester' => $entry['semester'] ?? $meta['semester'] ?? null,
                    'academic_year' => $entry['academic_year'] ?? $meta['academic_year'] ?? null,
                    'feedback' => $entry['feedback'] ?? null,
                ]);
            }

            return $created;
        });
    }

    public function getCourseReport(Course $course, ?string $semester = null, ?string $year = null): array
    {
        $gradesQuery = $course->grades()->with('student.user');

        if ($semester) {
            $gradesQuery->where('semester', $semester);
        }

        if ($year) {
            $gradesQuery->where('academic_year', $year);
        }

        /** @var Collection<int, Grade> $grades */
        $grades = $gradesQuery->get();

        $byStudent = $grades
            ->groupBy('student_id')
            ->map(function (Collection $studentGrades) {
                $student = $studentGrades->first()->student;

                $percentages = $studentGrades
                    ->filter(fn (Grade $grade) => $grade->score !== null && (float) $grade->max_score > 0)
                    ->map(fn (Grade $grade) => $grade->percentage);

                $average = $percentages->isNotEmpty()
                    ? round($percentages->avg(), 2)
                    : null;

                $byType = $studentGrades
                    ->groupBy('type')
                    ->map(function (Collection $typeGrades, string $type) {
                        $typePercentages = $typeGrades
                            ->filter(fn (Grade $grade) => $grade->percentage !== null)
                            ->pluck('percentage');

                        return [
                            'type' => $type,
                            'count' => $typeGrades->count(),
                            'average' => $typePercentages->isNotEmpty()
                                ? round($typePercentages->avg(), 2)
                                : null,
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'student_id' => $student->id,
                    'student' => $student,
                    'average' => $average,
                    'by_type' => $byType,
                ];
            })
            ->values()
            ->all();

        $allPercentages = $grades
            ->filter(fn (Grade $grade) => $grade->percentage !== null)
            ->pluck('percentage');

        return [
            'course_id' => $course->id,
            'course' => $course->load('teacher.user'),
            'semester' => $semester,
            'academic_year' => $year,
            'course_average' => $allPercentages->isNotEmpty()
                ? round($allPercentages->avg(), 2)
                : null,
            'by_student' => $byStudent,
        ];
    }
}
