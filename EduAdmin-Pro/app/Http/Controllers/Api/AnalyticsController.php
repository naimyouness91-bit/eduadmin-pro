<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $year = (int) $request->query('year', now()->year);
        $start = Carbon::create($year, 1, 1)->startOfDay();
        $end = Carbon::create($year, 12, 31)->endOfDay();

        $monthSql = $this->monthExpression('enrollment_date');

        $monthlyEnrollments = Student::query()
            ->selectRaw("{$monthSql} as month_num, COUNT(*) as count")
            ->whereNotNull('enrollment_date')
            ->whereBetween('enrollment_date', [$start, $end])
            ->groupBy('month_num')
            ->orderBy('month_num')
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->month_num => (int) $row->count]);

        $monthlyEnrollmentsArray = collect(range(1, 12))->map(fn ($m) => [
            'month' => $m,
            'count' => $monthlyEnrollments[$m] ?? 0,
        ])->values();

        $gradeMonthSql = $this->monthExpression('graded_at');

        $gradeTrends = Grade::query()
            ->selectRaw("{$gradeMonthSql} as month_num, AVG(score / NULLIF(max_score, 0) * 100) as average")
            ->whereNotNull('score')
            ->whereNotNull('graded_at')
            ->whereBetween('graded_at', [$start, $end])
            ->groupBy('month_num')
            ->orderBy('month_num')
            ->get()
            ->map(fn ($row) => [
                'month' => (int) $row->month_num,
                'average' => round((float) $row->average, 2),
            ]);

        $attendanceMonthSql = $this->monthExpression('date');

        $attendanceByMonth = Absence::query()
            ->selectRaw("{$attendanceMonthSql} as month_num, status, COUNT(*) as count")
            ->whereBetween('date', [$start, $end])
            ->groupBy('month_num', 'status')
            ->orderBy('month_num')
            ->get()
            ->groupBy('month_num')
            ->map(fn ($rows, $monthNum) => [
                'month' => (int) $monthNum,
                'present' => (int) $rows->where('status', 'present')->sum('count'),
                'absent' => (int) $rows->where('status', 'absent')->sum('count'),
                'late' => (int) $rows->where('status', 'late')->sum('count'),
                'excused' => (int) $rows->where('status', 'excused')->sum('count'),
            ])
            ->values();

        $grades = Grade::query()
            ->whereNotNull('score')
            ->whereBetween('graded_at', [$start, $end])
            ->get();

        $distribution = ['A+' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];
        foreach ($grades as $grade) {
            $letter = $grade->letter_grade ?? 'F';
            if ($letter === 'A+' || $letter === 'A') {
                $distribution['A+']++;
            } elseif (str_starts_with($letter, 'B')) {
                $distribution['B']++;
            } elseif (str_starts_with($letter, 'C')) {
                $distribution['C']++;
            } elseif ($letter === 'D') {
                $distribution['D']++;
            } else {
                $distribution['F']++;
            }
        }

        $topStudents = Student::query()
            ->with('user')
            ->get()
            ->map(fn (Student $s) => [
                'student' => $s,
                'average_grade' => $s->average_grade,
            ])
            ->filter(fn ($row) => $row['average_grade'] !== null)
            ->sortByDesc('average_grade')
            ->take(10)
            ->values();

        $coursePerformance = Course::query()
            ->with('teacher.user')
            ->get()
            ->map(function (Course $course) use ($start, $end) {
                $grades = $course->grades()
                    ->whereNotNull('score')
                    ->whereBetween('graded_at', [$start, $end])
                    ->get();
                $avg = $grades->isEmpty()
                    ? null
                    : round($grades->avg(fn (Grade $g) => $g->percentage), 2);

                return [
                    'course' => $course,
                    'enrolled_count' => $course->enrolled_count,
                    'average_grade' => $avg,
                    'grades_count' => $grades->count(),
                ];
            })
            ->filter(fn ($row) => $row['average_grade'] !== null);

        return response()->json([
            'year' => $year,
            'monthly_enrollments' => $monthlyEnrollmentsArray,
            'grade_distribution' => $distribution,
            'grade_trends' => $gradeTrends,
            'attendance_by_month' => $attendanceByMonth,
            'top_students' => $topStudents,
            'course_performance' => $coursePerformance->values(),
        ]);
    }

    /** Portable month extraction for MySQL, SQLite (tests), and PostgreSQL. */
    protected function monthExpression(string $column): string
    {
        $driver = Student::query()->getConnection()->getDriverName();

        return match ($driver) {
            'sqlite' => "CAST(strftime('%m', {$column}) AS INTEGER)",
            'pgsql' => "CAST(EXTRACT(MONTH FROM {$column}) AS INTEGER)",
            default => "MONTH({$column})",
        };
    }
}
