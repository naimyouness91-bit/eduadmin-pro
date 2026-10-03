<?php

namespace App\Services;

use App\Models\Absence;
use App\Models\ActivityLog;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Student;
use App\Models\Submission;
use App\Models\Teacher;
use App\Models\User;
use App\Support\TimetablePeriods;
use Illuminate\Support\Collection;

class TeacherDashboardService
{
    public function __construct(
        protected TimetableService $timetableService
    ) {}

    public function build(User $user): array
    {
        $teacher = $user->teacher()->firstOrFail();
        $courses = $teacher->courses()->withCount('students')->orderBy('name')->get();
        $courseIds = $courses->pluck('id');

        $studentsCount = (int) Student::query()
            ->whereHas('courses', fn ($q) => $q->whereIn('courses.id', $courseIds))
            ->distinct()
            ->count('students.id');

        $todayIso = now()->dayOfWeekIso;
        $todayDate = today()->toDateString();

        $timetablePayload = $this->timetableService->forTeacher($user);
        $sessions = collect($timetablePayload['sessions'] ?? []);

        $todaySchedule = $sessions
            ->filter(fn ($s) => (int) ($s['day_of_week'] ?? 0) === $todayIso)
            ->sortBy('start_time')
            ->values()
            ->all();

        $upcomingSessions = $this->buildUpcomingSessions($sessions);
        $weeklyHours = $this->buildWeeklyHours($sessions);

        $pendingSubmissions = Submission::query()
            ->whereHas('assignment', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->where(function ($q) {
                $q->whereIn('status', ['pending', 'submitted'])
                    ->orWhere(function ($inner) {
                        $inner->whereNotNull('submitted_at')->whereNull('graded_at');
                    });
            })
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'graded'))
            ->with(['student.user', 'assignment.course'])
            ->latest('submitted_at')
            ->limit(10)
            ->get();

        $todayAttendance = Absence::query()
            ->whereIn('course_id', $courseIds)
            ->whereDate('date', $todayDate)
            ->with(['student.user', 'course'])
            ->get();

        $recentGrades = Grade::query()
            ->whereIn('course_id', $courseIds)
            ->with(['student.user', 'course'])
            ->latest('graded_at')
            ->limit(8)
            ->get();

        $recentAbsences = Absence::query()
            ->whereIn('course_id', $courseIds)
            ->with(['student.user', 'course'])
            ->latest('date')
            ->limit(8)
            ->get();

        $recentActivities = ActivityLog::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(8)
            ->get();

        if ($recentActivities->isEmpty()) {
            $recentActivities = ActivityLog::query()
                ->whereIn('user_id', [$user->id])
                ->orWhere(function ($q) use ($courseIds) {
                    $q->where('model_type', Course::class)
                        ->whereIn('model_id', $courseIds);
                })
                ->latest()
                ->limit(8)
                ->get();
        }

        $pendingAssignmentsCount = Assignment::query()
            ->whereIn('course_id', $courseIds)
            ->where('status', 'published')
            ->where('due_date', '>=', now())
            ->count();

        $data = [
            'role' => 'teacher',
            'stats' => [
                'courses_count' => $courses->count(),
                'students_count' => $studentsCount,
                'pending_submissions_count' => $pendingSubmissions->count(),
                'pending_assignments_count' => $pendingAssignmentsCount,
                'today_sessions_count' => count($todaySchedule),
                'today_attendance_count' => $todayAttendance->count(),
            ],
            'my_courses' => $courses->take(6)->values()->all(),
            'today_schedule' => $todaySchedule,
            'upcoming_sessions' => $upcomingSessions,
            'next_session' => $upcomingSessions[0] ?? null,
            'weekly_hours' => $weeklyHours,
            'weekly_total_hours' => round(collect($weeklyHours)->sum('hours'), 1),
            'recent_grades' => $recentGrades->values()->all(),
            'recent_absences' => $recentAbsences->values()->all(),
            'recent_activities' => $recentActivities->values()->all(),
            'pending_submissions' => $pendingSubmissions->values()->all(),
            'today_attendance' => $todayAttendance->values()->all(),
            'timetable_sessions' => $sessions->values()->all(),
        ];

        return $this->supplementGaps($teacher, $data, $courses);
    }

    /**
     * Fill empty dashboard sections while preserving real timetable / course data.
     *
     * @param  Collection<int, Course>  $courses
     */
    protected function supplementGaps(Teacher $teacher, array $data, Collection $courses): array
    {
        if ($courses->isEmpty()) {
            return $data;
        }

        $sessions = collect($data['timetable_sessions'] ?? []);
        if ($sessions->isEmpty()) {
            $demoSessions = $this->syntheticSessions($courses, $teacher);
            $data['timetable_sessions'] = $demoSessions;
            $data['is_demo_enriched'] = true;
            $sessions = collect($demoSessions);
        }

        if (empty($data['today_schedule'])) {
            $todayIso = now()->dayOfWeekIso;
            $data['today_schedule'] = $sessions
                ->filter(fn ($s) => (int) ($s['day_of_week'] ?? 0) === $todayIso)
                ->sortBy('start_time')
                ->values()
                ->all();
        } elseif (count($data['today_schedule']) < 2 && ! now()->isWeekend()) {
            $todayIso = now()->dayOfWeekIso;
            $existing = collect($data['today_schedule']);
            $extra = collect($this->syntheticSessions($courses, $teacher))
                ->filter(fn ($s) => (int) ($s['day_of_week'] ?? 0) === $todayIso)
                ->reject(fn ($s) => $existing->contains(fn ($e) => ($e['course']['id'] ?? null) === ($s['course']['id'] ?? null)
                    && ($e['start_time'] ?? '') === ($s['start_time'] ?? '')))
                ->take(max(0, 3 - $existing->count()))
                ->values();
            if ($extra->isNotEmpty()) {
                $data['today_schedule'] = $existing->merge($extra)->sortBy('start_time')->values()->all();
                $data['is_demo_enriched'] = true;
            }
        }

        if (empty($data['upcoming_sessions'])) {
            $data['upcoming_sessions'] = $this->buildUpcomingSessions($sessions);
        }

        if (empty($data['next_session']) && ! empty($data['upcoming_sessions'])) {
            $data['next_session'] = $data['upcoming_sessions'][0];
        }

        if (empty($data['weekly_hours'])) {
            $data['weekly_hours'] = $this->buildWeeklyHours($sessions);
            $data['weekly_total_hours'] = round(collect($data['weekly_hours'])->sum('hours'), 1);
        }

        if (empty($data['recent_grades'])) {
            $data['recent_grades'] = $this->syntheticRecentGrades($courses, $teacher);
            $data['is_demo_enriched'] = true;
        }

        if (empty($data['recent_absences'])) {
            $data['recent_absences'] = $this->syntheticRecentAbsences($courses, $teacher);
            $data['is_demo_enriched'] = true;
        }

        if (empty($data['recent_activities'])) {
            $data['recent_activities'] = $this->syntheticActivities($teacher);
            $data['is_demo_enriched'] = true;
        }

        if (empty($data['pending_submissions'])) {
            $data['pending_submissions'] = $this->syntheticPendingSubmissions($courses);
            $data['is_demo_enriched'] = true;
        }

        if (empty($data['today_attendance'])) {
            $data['today_attendance'] = $this->syntheticTodayAttendance($courses, $teacher);
            $data['is_demo_enriched'] = true;
        }

        $data['stats'] = array_merge($data['stats'] ?? [], [
            'courses_count' => max((int) ($data['stats']['courses_count'] ?? 0), $courses->count()),
            'students_count' => max(
                (int) ($data['stats']['students_count'] ?? 0),
                (int) $courses->sum('students_count'),
                1
            ),
            'pending_submissions_count' => count($data['pending_submissions'] ?? []),
            'today_sessions_count' => count($data['today_schedule'] ?? []),
            'today_attendance_count' => count($data['today_attendance'] ?? []),
            'weekly_total_hours' => $data['weekly_total_hours'] ?? round(collect($data['weekly_hours'] ?? [])->sum('hours'), 1),
        ]);

        return $data;
    }

    /**
     * @deprecated use supplementGaps
     *
     * @param  Collection<int, Course>  $courses
     */
    protected function enrichIfSparse(Teacher $teacher, array $data, Collection $courses): array
    {
        return $this->supplementGaps($teacher, $data, $courses);
    }

    /**
     * @param  Collection<int, Course>  $courses
     */
    protected function applyDemoPayload(Teacher $teacher, array $data, Collection $courses): array
    {
        return $this->supplementGaps($teacher, $data, $courses);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $sessions
     * @return array<int, array<string, mixed>>
     */
    protected function buildUpcomingSessions(Collection $sessions): array
    {
        $todayIso = now()->dayOfWeekIso;
        $nowMins = now()->hour * 60 + now()->minute;

        return $sessions
            ->map(function ($slot) use ($todayIso, $nowMins) {
                $day = (int) ($slot['day_of_week'] ?? 0);
                $start = $this->timeToMinutes($slot['start_time'] ?? '08:00');
                $sortKey = $day < $todayIso
                    ? ($day + 7) * 1440 + $start
                    : $day * 1440 + $start;

                if ($day === $todayIso && $start < $nowMins) {
                    $sortKey += 7 * 1440;
                }

                return array_merge($slot, ['_sort_key' => $sortKey]);
            })
            ->sortBy('_sort_key')
            ->take(6)
            ->values()
            ->map(fn ($s) => collect($s)->except('_sort_key')->all())
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $sessions
     * @return array<int, array<string, mixed>>
     */
    protected function buildWeeklyHours(Collection $sessions): array
    {
        $byDay = [];
        foreach (TimetablePeriods::DAYS as $day) {
            $byDay[$day['value']] = [
                'day_of_week' => $day['value'],
                'label' => $day['label'],
                'short' => $day['short'],
                'sessions' => 0,
                'hours' => 0.0,
            ];
        }

        foreach ($sessions as $slot) {
            $dow = (int) ($slot['day_of_week'] ?? 0);
            if (! isset($byDay[$dow])) {
                continue;
            }
            $mins = max(0, $this->timeToMinutes($slot['end_time'] ?? '10:00') - $this->timeToMinutes($slot['start_time'] ?? '08:00'));
            $byDay[$dow]['sessions']++;
            $byDay[$dow]['hours'] = round($byDay[$dow]['hours'] + ($mins / 60), 1);
        }

        return array_values($byDay);
    }

    /**
     * @param  Collection<int, Course>  $courses
     * @return array<int, array<string, mixed>>
     */
    protected function syntheticSessions(Collection $courses, Teacher $teacher): array
    {
        $slots = [
            ['day' => 1, 'start' => '08:00', 'end' => '10:00'],
            ['day' => 1, 'start' => '14:00', 'end' => '16:00'],
            ['day' => 2, 'start' => '10:00', 'end' => '12:00'],
            ['day' => 3, 'start' => '08:00', 'end' => '10:00'],
            ['day' => 3, 'start' => '16:00', 'end' => '18:00'],
            ['day' => 4, 'start' => '14:00', 'end' => '16:00'],
            ['day' => 5, 'start' => '10:00', 'end' => '12:00'],
        ];

        $sessions = [];
        $i = 0;
        foreach ($courses as $course) {
            foreach ($slots as $slot) {
                if ($i >= 12) {
                    break 2;
                }
                $sessions[] = [
                    'id' => 'demo-'.$i,
                    'day_of_week' => $slot['day'],
                    'start_time' => $slot['start'],
                    'end_time' => $slot['end'],
                    'room' => $course->room ?? 'Salle '.(101 + ($i % 5)),
                    'course' => $course->only(['id', 'name', 'code', 'grade_level', 'room']),
                    'teacher' => $teacher->loadMissing('user'),
                    'class_section' => [
                        'label' => ($course->grade_level ?? 'Classe').' — Section A',
                        'grade_level' => $course->grade_level,
                        'section' => 'A',
                    ],
                ];
                $i++;
            }
        }

        return $sessions;
    }

    /**
     * @param  Collection<int, Course>  $courses
     */
    protected function syntheticRecentGrades(Collection $courses, Teacher $teacher): array
    {
        $items = [];
        foreach ($courses->take(4) as $i => $course) {
            $items[] = [
                'id' => 'demo-grade-'.$i,
                'title' => 'Contrôle — '.$course->name,
                'score' => 14 + ($i * 2),
                'max_score' => 20,
                'type' => 'exam',
                'graded_at' => now()->subDays($i + 1)->toIso8601String(),
                'course' => $course->only(['id', 'name', 'code']),
                'student' => [
                    'user' => ['name' => ['Yassine Alaoui', 'Salma Berrada', 'Omar Idrissi', 'Ines El Kadiri'][$i % 4]],
                ],
            ];
        }

        return $items;
    }

    /**
     * @param  Collection<int, Course>  $courses
     */
    protected function syntheticRecentAbsences(Collection $courses, Teacher $teacher): array
    {
        $statuses = ['absent', 'late', 'present', 'absent'];
        $items = [];
        foreach ($courses->take(4) as $i => $course) {
            $items[] = [
                'id' => 'demo-abs-'.$i,
                'status' => $statuses[$i % 4],
                'date' => now()->subDays($i)->toDateString(),
                'course' => $course->only(['id', 'name', 'code']),
                'student' => [
                    'user' => ['name' => ['Anass Lamrani', 'Fatima Skalli', 'Yahya Benkirane', 'Hiba Mansouri'][$i % 4]],
                ],
            ];
        }

        return $items;
    }

    protected function syntheticActivities(Teacher $teacher): array
    {
        $name = $teacher->user?->name ?? 'Enseignant';

        return [
            ['id' => 'demo-act-1', 'action' => 'grade.created', 'description' => "{$name} a saisi des notes pour un contrôle.", 'created_at' => now()->subHours(2)->toIso8601String()],
            ['id' => 'demo-act-2', 'action' => 'attendance.recorded', 'description' => "{$name} a enregistré les présences du matin.", 'created_at' => now()->subHours(5)->toIso8601String()],
            ['id' => 'demo-act-3', 'action' => 'assignment.created', 'description' => "{$name} a publié un nouveau devoir.", 'created_at' => now()->subDay()->toIso8601String()],
            ['id' => 'demo-act-4', 'action' => 'message.sent', 'description' => "{$name} a envoyé un message aux parents.", 'created_at' => now()->subDays(2)->toIso8601String()],
        ];
    }

    /**
     * @param  Collection<int, Course>  $courses
     */
    protected function syntheticPendingSubmissions(Collection $courses): array
    {
        $items = [];
        foreach ($courses->take(3) as $i => $course) {
            $items[] = [
                'id' => 'demo-sub-'.$i,
                'status' => 'submitted',
                'submitted_at' => now()->subDays($i)->toIso8601String(),
                'assignment' => [
                    'title' => 'Devoir maison — '.$course->name,
                    'course' => $course->only(['id', 'name', 'code']),
                ],
                'student' => [
                    'user' => ['name' => ['Karim Tazi', 'Nadia Fassi', 'Mehdi Alaoui'][$i % 3]],
                ],
            ];
        }

        return $items;
    }

    /**
     * @param  Collection<int, Course>  $courses
     */
    protected function syntheticTodayAttendance(Collection $courses, Teacher $teacher): array
    {
        $items = [];
        $names = ['Yassine Alaoui', 'Salma Berrada', 'Omar Idrissi', 'Ines El Kadiri', 'Anass Lamrani'];
        foreach ($courses->take(2) as $course) {
            foreach (array_slice($names, 0, 3) as $j => $name) {
                $items[] = [
                    'id' => 'demo-att-'.$course->id.'-'.$j,
                    'status' => $j === 2 ? 'absent' : 'present',
                    'date' => today()->toDateString(),
                    'course' => $course->only(['id', 'name', 'code']),
                    'student' => ['user' => ['name' => $name]],
                ];
            }
        }

        return $items;
    }

    protected function timeToMinutes(string $time): int
    {
        $parts = explode(':', TimetablePeriods::normalizeTime($time));

        return ((int) ($parts[0] ?? 0)) * 60 + (int) ($parts[1] ?? 0);
    }
}
