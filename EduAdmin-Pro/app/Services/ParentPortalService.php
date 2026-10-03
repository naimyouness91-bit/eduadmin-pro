<?php

namespace App\Services;

use App\Models\Absence;
use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Event;
use App\Models\Grade;
use App\Models\ParentModel;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ParentPortalService
{
    public function childrenFor(User $user): Collection
    {
        $parent = $user->parent()->firstOrFail();

        return $parent->students()
            ->with('user')
            ->get()
            ->map(fn (Student $student) => $this->childSummary($student));
    }

    public function childDetail(Student $student): array
    {
        $student->load(['user', 'courses.teacher.user']);

        return [
            ...$this->childSummary($student),
            'recent_attendance' => Absence::where('student_id', $student->id)
                ->with('course')
                ->latest('date')
                ->limit(10)
                ->get(),
            'announcements' => Announcement::where('is_published', true)
                ->where(fn ($q) => $q->whereNull('target_role')->orWhere('target_role', 'parent'))
                ->latest('published_at')
                ->limit(5)
                ->get(),
        ];
    }

    public function dashboardData(User $user): array
    {
        $parent = $user->parent()->firstOrFail();
        $today = now()->dayOfWeekIso;

        $children = $parent->students()
            ->with('user')
            ->get()
            ->map(function (Student $student) use ($today) {
                $courseIds = $student->courses()->pluck('courses.id');

                return [
                    'student' => $student,
                    'average_grade' => $student->average_grade,
                    'attendance_rate' => $student->attendance_rate,
                    'recent_grades' => $student->grades()
                        ->with('course')
                        ->latest()
                        ->limit(5)
                        ->get(),
                    'recent_attendance' => $student->absences()
                        ->with('course')
                        ->latest('date')
                        ->limit(5)
                        ->get(),
                    'today_schedule' => Schedule::whereIn('course_id', $courseIds)
                        ->where('day_of_week', $today)
                        ->where('is_active', true)
                        ->with(['course', 'teacher.user'])
                        ->orderBy('start_time')
                        ->get(),
                ];
            });

        $performance = $this->performanceSummary($children);

        return [
            'role' => 'parent',
            'children' => $children,
            'performance' => $performance,
            'announcements' => Announcement::where('is_published', true)
                ->where(fn ($q) => $q->whereNull('target_role')->orWhere('target_role', 'parent'))
                ->latest('published_at')
                ->limit(5)
                ->get(),
            'upcoming_events' => Event::where('is_public', true)
                ->where('start_date', '>=', now())
                ->orderBy('start_date')
                ->limit(5)
                ->get(),
            'notifications' => $user->notifications()->latest()->limit(10)->get(),
        ];
    }

    public function childGrades(Student $student, Request $request)
    {
        $query = $student->grades()
            ->with(['course', 'teacher.user'])
            ->latest('graded_at')
            ->latest('id');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('course', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        return $query->paginate($request->integer('per_page', 15));
    }

    /**
     * @return array{total: int, average: float, exams: int, quizzes: int, homework: int, projects: int}
     */
    public function childGradeStats(Student $student, Request $request): array
    {
        $query = Grade::query()->where('student_id', $student->id);

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

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

    public function childAttendance(Student $student, Request $request)
    {
        $query = $student->absences()
            ->with(['course', 'teacher.user'])
            ->latest('date');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('date')) {
            $query->whereDate('date', $request->query('date'));
        }

        return $query->paginate($request->integer('per_page', 15));
    }

    public function childAssignments(Student $student, Request $request)
    {
        $courseIds = $student->courses()->pluck('courses.id');

        $query = Assignment::query()
            ->whereIn('course_id', $courseIds)
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'published'))
            ->with(['course', 'teacher.user'])
            ->latest('due_date');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        return $query->paginate($request->integer('per_page', 15));
    }

    public function childSchedule(Student $student): array
    {
        $courseIds = $student->courses()->pluck('courses.id');
        $today = now()->dayOfWeekIso;

        $schedule = Schedule::whereIn('course_id', $courseIds)
            ->where('is_active', true)
            ->with(['course', 'teacher.user'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return [
            'weekly' => $schedule,
            'today' => $schedule->where('day_of_week', $today)->values(),
        ];
    }

    public function parentFor(User $user): ParentModel
    {
        return $user->parent()->firstOrFail();
    }

    protected function childSummary(Student $student): array
    {
        return [
            'student' => $student,
            'average_grade' => $student->average_grade,
            'attendance_rate' => $student->attendance_rate,
            'courses_count' => $student->courses()->count(),
            'recent_grades' => $student->grades()->with('course')->latest()->limit(3)->get(),
        ];
    }

    protected function performanceSummary(Collection $children): array
    {
        $grades = $children->pluck('average_grade')->filter(fn ($v) => $v !== null);
        $attendance = $children->pluck('attendance_rate')->filter(fn ($v) => $v !== null);

        return [
            'children_count' => $children->count(),
            'average_grade' => $grades->isEmpty() ? null : round($grades->avg(), 1),
            'average_attendance' => $attendance->isEmpty() ? null : round($attendance->avg(), 1),
        ];
    }
}
