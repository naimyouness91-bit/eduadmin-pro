<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ParentPortalService;
use App\Services\TeacherDashboardService;
use App\Models\Absence;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Event;
use App\Models\Grade;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\Submission;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected TeacherDashboardService $teacherDashboardService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = match (true) {
            $user->isSuperAdmin() || $user->isAdmin() => $this->adminDashboard(),
            $user->isTeacher() => $this->teacherDashboard($user),
            $user->isStudent() => $this->studentDashboard($user),
            $user->isParent() => $this->parentDashboard($user),
            default => ['message' => 'Unknown role.'],
        };

        return response()->json($data);
    }

    public function adminDashboard(): array
    {
        $from = now()->subDays(30)->toDateString();

        $attendanceTrend = Absence::query()
            ->where('date', '>=', $from)
            ->selectRaw('date, status, COUNT(*) as count')
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get()
            ->groupBy(fn ($row) => $row->date)
            ->map(fn ($rows, $date) => [
                'date' => $date,
                'present' => $rows->where('status', 'present')->sum('count'),
                'absent' => $rows->where('status', 'absent')->sum('count'),
                'late' => $rows->where('status', 'late')->sum('count'),
                'excused' => $rows->where('status', 'excused')->sum('count'),
            ])
            ->values();

        $grades = Grade::query()->whereNotNull('score')->select(['score', 'max_score'])->get();
        $distribution = collect(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'])
            ->mapWithKeys(fn ($letter) => [$letter => 0]);

        foreach ($grades as $grade) {
            $letter = $grade->letter_grade ?? 'F';
            $distribution[$letter] = ($distribution[$letter] ?? 0) + 1;
        }

        return [
            'role' => 'admin',
            'stats' => [
                'total_students' => Student::count(),
                'total_teachers' => Teacher::count(),
                'total_courses' => Course::count(),
            ],
            'attendance_trend' => $attendanceTrend,
            'grade_distribution' => $distribution,
            'recent_activities' => ActivityLog::with('user')
                ->latest()
                ->limit(10)
                ->get(),
            'announcements' => Announcement::where('is_published', true)
                ->latest('published_at')
                ->limit(5)
                ->get(),
            'upcoming_events' => Event::where('start_date', '>=', now())
                ->orderBy('start_date')
                ->limit(5)
                ->get(),
        ];
    }

    public function teacherDashboard(User $user): array
    {
        return $this->teacherDashboardService->build($user);
    }

    public function studentDashboard(User $user): array
    {
        $student = $user->student;

        if (! $student) {
            return [
                'role' => 'student',
                'profile_missing' => true,
                'message' => 'Student profile is not linked to this account yet.',
                'enrolled_courses' => [],
                'recent_grades' => [],
                'attendance_rate' => null,
                'upcoming_assignments' => [],
                'today_schedule' => [],
            ];
        }

        $courseIds = $student->courses()->pluck('courses.id');
        $today = now()->dayOfWeekIso;

        return [
            'role' => 'student',
            'enrolled_courses' => $student->courses()->with('teacher.user')->get(),
            'recent_grades' => $student->grades()
                ->with('course')
                ->latest()
                ->limit(10)
                ->get(),
            'attendance_rate' => $student->attendance_rate,
            'upcoming_assignments' => Assignment::whereIn('course_id', $courseIds)
                ->where('due_date', '>=', now())
                ->orderBy('due_date')
                ->limit(10)
                ->get(),
            'today_schedule' => Schedule::whereIn('course_id', $courseIds)
                ->where('day_of_week', $today)
                ->where('is_active', true)
                ->with(['course', 'teacher.user'])
                ->orderBy('start_time')
                ->get(),
        ];
    }

    public function parentDashboard(User $user): array
    {
        return app(ParentPortalService::class)->dashboardData($user);
    }
}
