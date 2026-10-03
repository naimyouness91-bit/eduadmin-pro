<?php

namespace App\Services;

use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Schedule;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Support\TimetablePeriods;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TimetableAutoGenerator
{
    protected const MAX_WEEKLY_SLOTS = 20;

    /** @var array<string, array<int, string>> */
    protected array $categoryKeywords = [
        'scientific' => [
            'math', 'physic', 'chem', 'bio', 'scienc', 'svt', 'info', 'informatique',
            'techno', 'engineer', 'calcul', 'géom', 'geom', 'stat',
        ],
        'literary' => [
            'franç', 'franc', 'french', 'english', 'anglais', 'arab', 'histoir',
            'géo', 'geo', 'philo', 'littéra', 'literature', 'espagnol', 'allemand',
            'langue', 'culture', 'civic', 'économie',
        ],
    ];

    public function __construct(
        protected TimetableService $timetableService
    ) {}

    /**
     * Build a Mon–Fri timetable using realistic school scheduling rules.
     *
     * @return array<string, mixed> grid payload with generation_summary
     */
    public function generate(ClassSection $section, User $admin, bool $publish = true): array
    {
        $courses = $this->timetableService->coursesForSection($section);

        if ($courses->isEmpty()) {
            throw ValidationException::withMessages([
                'class_section_id' => 'No courses found for this class. Add courses before generating a timetable.',
            ]);
        }

        $timetable = $this->resolveTimetable($section, $admin);
        $sessionsPlan = $this->buildSessionsPlan($courses);
        $totalRequested = array_sum($sessionsPlan);

        $result = DB::transaction(function () use ($timetable, $courses, $sessionsPlan, $publish) {
            $timetable->entries()->delete();

            $placement = $this->placeSessions($timetable, $courses, $sessionsPlan);

            if ($placement['placed'] === 0) {
                throw ValidationException::withMessages([
                    'class_section_id' => 'Could not place any sessions. Check teacher availability and rooms.',
                ]);
            }

            if ($publish) {
                $conflicts = $this->timetableService->detectConflicts($timetable);
                if ($conflicts->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'conflicts' => $conflicts->values()->all(),
                    ]);
                }

                $this->timetableService->publish($timetable);
            }

            return $placement;
        });

        $grid = $this->timetableService->gridPayload($timetable->fresh());
        $grid['generation_summary'] = $this->buildSummary(
            $grid,
            $courses,
            $sessionsPlan,
            $result['unplaced'],
            $totalRequested
        );

        return $grid;
    }

    protected function resolveTimetable(ClassSection $section, User $admin): Timetable
    {
        $existing = Timetable::query()
            ->where('class_section_id', $section->id)
            ->orderByDesc('is_published')
            ->orderByDesc('updated_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->timetableService->createTimetable([
            'class_section_id' => $section->id,
            'name' => "Emploi du temps — {$section->label}",
        ], $admin);
    }

    /**
     * @param  array<int, int>  $sessionsPlan
     * @return array{placed: int, unplaced: array<int, array{course: Course, target_day: int}>}
     */
    protected function placeSessions(Timetable $timetable, Collection $courses, array $sessionsPlan): array
    {
        $queue = $this->buildSessionQueue($courses, $sessionsPlan);
        $external = $this->loadExternalOccupancy($timetable->id);
        $teacherAvailability = $this->loadTeacherAvailabilityBlocks();

        $state = [
            'class' => [],
            'teachers' => [],
            'rooms' => [],
            'courseDay' => [],
            'dayBands' => array_fill_keys(TimetablePeriods::WEEKDAY_VALUES, ['morning' => 0, 'afternoon' => 0]),
            'dayCategories' => array_fill_keys(TimetablePeriods::WEEKDAY_VALUES, ['scientific' => 0, 'literary' => 0, 'general' => 0]),
            'teacherDayBands' => [],
            'teacherWeekLoad' => [],
            'teacherMorningDays' => [],
            'teacherAfternoonDays' => [],
        ];

        $placed = 0;
        $unplaced = [];

        foreach ($queue as $item) {
            /** @var Course $course */
            $course = $item['course'];
            $teacherId = $course->teacher_id;
            $room = trim((string) ($course->room ?: $this->defaultRoom($course, $timetable)));
            $category = $this->courseCategory($course);

            $bestSlot = $this->findBestSlot(
                $item['target_day'],
                $course,
                $category,
                $teacherId,
                $room,
                $state,
                $external,
                $teacherAvailability
            );

            if ($bestSlot === null) {
                $unplaced[] = $item;
                continue;
            }

            TimetableEntry::create([
                'timetable_id' => $timetable->id,
                'day_of_week' => $bestSlot['day'],
                'start_time' => $bestSlot['start'],
                'end_time' => $bestSlot['end'],
                'course_id' => $course->id,
                'teacher_id' => $teacherId,
                'room' => $room ?: null,
            ]);

            $this->occupySlot($state, $external, $bestSlot, $course, $teacherId, $room, $category);
            $placed++;
        }

        return ['placed' => $placed, 'unplaced' => $unplaced];
    }

    /**
     * @param  array<string, mixed>  $state
     * @param  array<string, mixed>  $external
     * @param  array<string, array<int, array<int, array{start: string, end: string}>>>  $teacherAvailability
     * @return array{day: int, start: string, end: string, band: string}|null
     */
    protected function findBestSlot(
        int $targetDay,
        Course $course,
        string $category,
        ?int $teacherId,
        string $room,
        array &$state,
        array $external,
        array $teacherAvailability
    ): ?array {
        $candidates = [];

        foreach (TimetablePeriods::weekdaySlots() as $slot) {
            if (($state['courseDay'][$course->id][$slot['day']] ?? 0) >= 1) {
                continue;
            }

            if ($this->slotTakenByClass($state['class'], $slot)) {
                continue;
            }

            if ($teacherId) {
                if ($this->slotConflicts($state['teachers'][$teacherId][$slot['day']] ?? [], $slot)) {
                    continue;
                }
                if ($this->slotConflicts($external['teachers'][$teacherId][$slot['day']] ?? [], $slot)) {
                    continue;
                }
                if ($this->slotConflicts($teacherAvailability[$teacherId][$slot['day']] ?? [], $slot)) {
                    continue;
                }
                if ($this->teacherWouldBeFullDay($state, $teacherId, $slot)) {
                    continue;
                }
            }

            if ($room !== '') {
                $roomKey = strtolower($room);
                if ($this->slotConflicts($state['rooms'][$roomKey][$slot['day']] ?? [], $slot)) {
                    continue;
                }
                if ($this->slotConflicts($external['rooms'][$roomKey][$slot['day']] ?? [], $slot)) {
                    continue;
                }
            }

            $score = $this->scoreSlot($slot, $targetDay, $course, $category, $teacherId, $state);
            $candidates[] = ['slot' => $slot, 'score' => $score];
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, fn ($a, $b) => $a['score'] <=> $b['score']);

        return $candidates[0]['slot'];
    }

    /**
     * @param  array<string, mixed>  $state
     */
    protected function scoreSlot(
        array $slot,
        int $targetDay,
        Course $course,
        string $category,
        ?int $teacherId,
        array $state
    ): int {
        $score = 0;
        $day = $slot['day'];
        $band = $slot['band'];

        if ($day === $targetDay) {
            $score -= 100;
        }

        $dayOffset = abs($day - $targetDay);
        $score += $dayOffset * 8;

        $morningCount = $state['dayBands'][$day]['morning'] ?? 0;
        $afternoonCount = $state['dayBands'][$day]['afternoon'] ?? 0;

        if ($band === 'morning' && $morningCount > $afternoonCount) {
            $score += 18;
        } elseif ($band === 'afternoon' && $afternoonCount > $morningCount) {
            $score += 18;
        } else {
            $score -= 12;
        }

        if ($this->hasAdjacentClassSession($state['class'], $day, $slot)) {
            $score -= 45;
        } elseif ($this->createsGap($state['class'], $day, $slot)) {
            $score += 30;
        }

        $dayCat = $state['dayCategories'][$day] ?? ['scientific' => 0, 'literary' => 0, 'general' => 0];
        if ($category === 'scientific' && ($dayCat['scientific'] ?? 0) > ($dayCat['literary'] ?? 0)) {
            $score += 14;
        } elseif ($category === 'literary' && ($dayCat['literary'] ?? 0) > ($dayCat['scientific'] ?? 0)) {
            $score += 14;
        } elseif ($category !== 'general') {
            $score -= 8;
        }

        if ($teacherId) {
            $score += ($state['teacherWeekLoad'][$teacherId] ?? 0) * 4;

            if ($band === 'morning') {
                $score += count($state['teacherMorningDays'][$teacherId] ?? []) * 3;
            } else {
                $score += count($state['teacherAfternoonDays'][$teacherId] ?? []) * 3;
            }
        }

        $courseSessionsPlaced = array_sum($state['courseDay'][$course->id] ?? []);
        $score += $courseSessionsPlaced * 25;

        return $score;
    }

    /**
     * @param  array<string, mixed>  $state
     */
    protected function teacherWouldBeFullDay(array $state, int $teacherId, array $slot): bool
    {
        $bands = array_merge(
            ['morning' => false, 'afternoon' => false],
            $state['teacherDayBands'][$teacherId][$slot['day']] ?? []
        );
        $addingMorning = $slot['band'] === 'morning';
        $addingAfternoon = $slot['band'] === 'afternoon';

        $willHaveMorning = $bands['morning'] || $addingMorning;
        $willHaveAfternoon = $bands['afternoon'] || $addingAfternoon;

        $sessionsToday = count($state['teachers'][$teacherId][$slot['day']] ?? []);

        return $willHaveMorning && $willHaveAfternoon && $sessionsToday >= 1;
    }

    /**
     * @param  array<int, array{start: string, end: string}>  $daySlots
     * @param  array{day: int, start: string, end: string}  $slot
     */
    protected function hasAdjacentClassSession(array $daySlots, int $day, array $slot): bool
    {
        $existing = $daySlots[$day] ?? [];
        if ($existing === []) {
            return false;
        }

        $slotStart = strtotime($slot['start']);
        foreach ($existing as $other) {
            $otherEnd = strtotime($other['end']);
            $otherStart = strtotime($other['start']);
            if ($otherEnd === $slotStart || $otherStart === strtotime($slot['end'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array{start: string, end: string}>  $daySlots
     */
    protected function createsGap(array $daySlots, int $day, array $slot): bool
    {
        $existing = $daySlots[$day] ?? [];
        if (count($existing) === 0) {
            return false;
        }

        $starts = array_map(fn ($s) => strtotime($s['start']), $existing);
        $ends = array_map(fn ($s) => strtotime($s['end']), $existing);
        $allStarts = array_merge($starts, [strtotime($slot['start'])]);
        $allEnds = array_merge($ends, [strtotime($slot['end'])]);
        sort($allStarts);
        sort($allEnds);

        $min = min($allStarts);
        $max = max($allEnds);
        $span = ($max - $min) / 3600;
        $count = count($existing) + 1;

        return $span > ($count * 2 + 2);
    }

    /**
     * @param  array<string, mixed>  $state
     */
    protected function occupySlot(
        array &$state,
        array &$external,
        array $slot,
        Course $course,
        ?int $teacherId,
        string $room,
        string $category
    ): void {
        $day = $slot['day'];
        $band = $slot['band'];
        $timeSlot = ['start' => $slot['start'], 'end' => $slot['end']];

        $state['class'][$day][] = $timeSlot;
        $state['courseDay'][$course->id][$day] = ($state['courseDay'][$course->id][$day] ?? 0) + 1;
        $state['dayBands'][$day][$band]++;
        $state['dayCategories'][$day][$category] = ($state['dayCategories'][$day][$category] ?? 0) + 1;

        if ($teacherId) {
            $state['teachers'][$teacherId][$day][] = $timeSlot;
            $state['teacherWeekLoad'][$teacherId] = ($state['teacherWeekLoad'][$teacherId] ?? 0) + 1;
            $state['teacherDayBands'][$teacherId][$day] = array_merge(
                ['morning' => false, 'afternoon' => false],
                $state['teacherDayBands'][$teacherId][$day] ?? [],
                [$band => true]
            );

            if ($band === 'morning' && ! in_array($day, $state['teacherMorningDays'][$teacherId] ?? [], true)) {
                $state['teacherMorningDays'][$teacherId][] = $day;
            }
            if ($band === 'afternoon' && ! in_array($day, $state['teacherAfternoonDays'][$teacherId] ?? [], true)) {
                $state['teacherAfternoonDays'][$teacherId][] = $day;
            }
        }

        if ($room !== '') {
            $state['rooms'][strtolower($room)][$day][] = $timeSlot;
        }
    }

    /**
     * @param  array<int, int>  $sessionsPlan
     * @return array<int, array{course: Course, target_day: int, category: string}>
     */
    protected function buildSessionQueue(Collection $courses, array $sessionsPlan): array
    {
        $queue = [];
        $courseIndex = 0;

        foreach ($courses->values() as $course) {
            $sessions = $sessionsPlan[$course->id] ?? 2;
            $category = $this->courseCategory($course);

            for ($i = 0; $i < $sessions; $i++) {
                $targetDay = TimetablePeriods::WEEKDAY_VALUES[($courseIndex + $i * 2) % count(TimetablePeriods::WEEKDAY_VALUES)];
                $queue[] = [
                    'course' => $course,
                    'target_day' => $targetDay,
                    'category' => $category,
                ];
            }
            $courseIndex++;
        }

        usort($queue, function ($a, $b) {
            $catOrder = ['scientific' => 0, 'literary' => 1, 'general' => 2];

            return [$catOrder[$a['category']] ?? 3, $a['target_day']]
                <=> [$catOrder[$b['category']] ?? 3, $b['target_day']];
        });

        return $queue;
    }

    /**
     * @return array<int, int>
     */
    protected function buildSessionsPlan(Collection $courses): array
    {
        $plan = [];
        $courseCount = $courses->count();

        foreach ($courses as $course) {
            $desired = 2;
            if ($course->credits && (int) $course->credits > 0) {
                $desired = max(2, min(4, (int) ceil($course->credits / 2)));
            }
            $plan[$course->id] = $desired;
        }

        $total = array_sum($plan);
        if ($total <= self::MAX_WEEKLY_SLOTS) {
            return $plan;
        }

        $perCourse = max(1, (int) floor(self::MAX_WEEKLY_SLOTS / max(1, $courseCount)));
        foreach ($plan as $courseId => $_) {
            $plan[$courseId] = $perCourse;
        }

        while (array_sum($plan) > self::MAX_WEEKLY_SLOTS) {
            $maxId = array_keys($plan, max($plan))[0];
            $plan[$maxId]--;
        }

        return $plan;
    }

    protected function courseCategory(Course $course): string
    {
        $text = strtolower(trim($course->name.' '.$course->code.' '.($course->description ?? '')));

        foreach ($this->categoryKeywords['scientific'] as $keyword) {
            if (str_contains($text, $keyword)) {
                return 'scientific';
            }
        }

        foreach ($this->categoryKeywords['literary'] as $keyword) {
            if (str_contains($text, $keyword)) {
                return 'literary';
            }
        }

        return 'general';
    }

    /**
     * @param  array<int, int>  $sessionsPlan
     * @param  array<int, array{course: Course, target_day: int}>  $unplaced
     * @return array<string, mixed>
     */
    protected function buildSummary(
        array $grid,
        Collection $courses,
        array $sessionsPlan,
        array $unplaced,
        int $totalRequested
    ): array {
        $sessions = collect($grid['sessions'] ?? []);
        $morning = 0;
        $afternoon = 0;
        $dailyBalance = [];

        foreach (TimetablePeriods::WEEKDAY_VALUES as $day) {
            $dailyBalance[$day] = ['morning' => 0, 'afternoon' => 0];
        }

        foreach ($sessions as $session) {
            $band = TimetablePeriods::bandForTime($session['start_time']);
            if ($band === 'morning') {
                $morning++;
            } else {
                $afternoon++;
            }
            $day = (int) $session['day_of_week'];
            if (isset($dailyBalance[$day])) {
                $dailyBalance[$day][$band]++;
            }
        }

        $teacherWorkload = $sessions
            ->filter(fn ($s) => ! empty($s['teacher']['id']))
            ->groupBy(fn ($s) => $s['teacher']['id'])
            ->map(function ($items, $teacherId) {
                $morningCount = 0;
                $afternoonCount = 0;
                foreach ($items as $item) {
                    if (TimetablePeriods::bandForTime($item['start_time']) === 'morning') {
                        $morningCount++;
                    } else {
                        $afternoonCount++;
                    }
                }

                return [
                    'teacher_id' => (int) $teacherId,
                    'name' => $items->first()['teacher']['user']['name'] ?? 'Unknown',
                    'sessions' => $items->count(),
                    'morning' => $morningCount,
                    'afternoon' => $afternoonCount,
                ];
            })
            ->sortByDesc('sessions')
            ->values()
            ->all();

        $placedByCourse = $sessions->groupBy(fn ($s) => $s['course']['id'] ?? 0);

        $subjectCoverage = $courses->map(function (Course $course) use ($sessionsPlan, $placedByCourse) {
            $placed = $placedByCourse->get($course->id)?->count() ?? 0;

            return [
                'course_id' => $course->id,
                'name' => $course->name,
                'requested' => $sessionsPlan[$course->id] ?? 0,
                'placed' => $placed,
                'complete' => $placed >= ($sessionsPlan[$course->id] ?? 0),
            ];
        })->values()->all();

        $dayLabels = collect(TimetablePeriods::DAYS)
            ->keyBy('value')
            ->map(fn ($d) => $d['label'])
            ->all();

        return [
            'sessions_generated' => $sessions->count(),
            'sessions_requested' => $totalRequested,
            'sessions_unplaced' => count($unplaced),
            'morning_sessions' => $morning,
            'afternoon_sessions' => $afternoon,
            'morning_percentage' => $sessions->count() > 0 ? round($morning / $sessions->count() * 100) : 0,
            'afternoon_percentage' => $sessions->count() > 0 ? round($afternoon / $sessions->count() * 100) : 0,
            'teacher_workload' => $teacherWorkload,
            'daily_balance' => collect($dailyBalance)->map(fn ($counts, $day) => [
                'day' => (int) $day,
                'day_label' => $dayLabels[$day] ?? "Day {$day}",
                'morning' => $counts['morning'],
                'afternoon' => $counts['afternoon'],
            ])->values()->all(),
            'subject_coverage' => $subjectCoverage,
            'conflicts_count' => count($grid['conflicts'] ?? []),
            'conflicts' => $grid['conflicts'] ?? [],
            'rules_applied' => [
                'weekdays' => 'Monday – Friday',
                'session_duration' => '2 hours minimum',
                'time_blocks' => ['08:00–10:00', '10:00–12:00', '14:00–16:00', '16:00–18:00'],
                'max_one_subject_per_day' => true,
                'morning_afternoon_balance' => true,
                'scientific_literary_mix' => true,
                'teacher_conflict_avoidance' => true,
                'teacher_full_day_avoidance' => true,
            ],
        ];
    }

    /**
     * @return array{teachers: array<int, array<int, array<int, array{start: string, end: string}>>>, rooms: array<string, array<int, array<int, array{start: string, end: string}>>>}
     */
    protected function loadExternalOccupancy(int $excludeTimetableId): array
    {
        $entries = TimetableEntry::query()
            ->where('timetable_id', '!=', $excludeTimetableId)
            ->get();

        $teachers = [];
        $rooms = [];

        foreach ($entries as $entry) {
            $day = (int) $entry->day_of_week;
            $slot = [
                'start' => TimetablePeriods::normalizeTime($entry->start_time),
                'end' => TimetablePeriods::normalizeTime($entry->end_time),
            ];

            if ($entry->teacher_id) {
                $teachers[$entry->teacher_id][$day][] = $slot;
            }

            if ($entry->room) {
                $rooms[strtolower(trim($entry->room))][$day][] = $slot;
            }
        }

        return ['teachers' => $teachers, 'rooms' => $rooms];
    }

    /**
     * Legacy course schedules treated as teacher unavailability.
     *
     * @return array<int, array<int, array<int, array{start: string, end: string}>>>
     */
    protected function loadTeacherAvailabilityBlocks(): array
    {
        $blocks = [];
        $schedules = Schedule::query()
            ->where('is_active', true)
            ->whereNotNull('teacher_id')
            ->get();

        foreach ($schedules as $schedule) {
            $day = (int) $schedule->day_of_week;
            $blocks[$schedule->teacher_id][$day][] = [
                'start' => TimetablePeriods::normalizeTime($schedule->start_time),
                'end' => TimetablePeriods::normalizeTime($schedule->end_time),
            ];
        }

        return $blocks;
    }

    protected function defaultRoom(Course $course, Timetable $timetable): string
    {
        $section = $timetable->classSection;
        $grade = $section?->grade_level ?? $course->grade_level ?? 'Classe';

        return 'Salle '.$grade;
    }

    /**
     * @param  array<int, array{start: string, end: string}>  $occupied
     * @param  array{day: int, start: string, end: string}  $slot
     */
    protected function slotConflicts(array $occupied, array $slot): bool
    {
        foreach ($occupied as $other) {
            if ($this->timesOverlap($slot['start'], $slot['end'], $other['start'], $other['end'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<int, array{start: string, end: string}>>  $localClass
     */
    protected function slotTakenByClass(array $localClass, array $slot): bool
    {
        return $this->slotConflicts($localClass[$slot['day']] ?? [], $slot);
    }

    protected function timesOverlap(string $startA, string $endA, string $startB, string $endB): bool
    {
        $a1 = strtotime(TimetablePeriods::normalizeTime($startA));
        $a2 = strtotime(TimetablePeriods::normalizeTime($endA));
        $b1 = strtotime(TimetablePeriods::normalizeTime($startB));
        $b2 = strtotime(TimetablePeriods::normalizeTime($endB));

        return $a1 < $b2 && $b1 < $a2;
    }
}
