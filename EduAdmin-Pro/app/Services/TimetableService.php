<?php

namespace App\Services;

use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Student;
use App\Models\SystemSetting;
use App\Models\Teacher;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Support\TimetablePeriods;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TimetableService
{
    public function periodsMeta(): array
    {
        return [
            'days' => TimetablePeriods::DAYS,
            'periods' => TimetablePeriods::PERIODS,
        ];
    }

    public function listClassSections(): Collection
    {
        $this->syncClassSectionsFromStudents();

        return ClassSection::query()
            ->where('is_active', true)
            ->orderBy('grade_level')
            ->orderBy('section')
            ->get();
    }

    /**
     * Ensure class_sections rows exist for every distinct student grade/section pair.
     */
    public function syncClassSectionsFromStudents(): int
    {
        $year = SystemSetting::get('academic_year') ?: null;
        $created = 0;

        $pairs = Student::query()
            ->whereNotNull('grade_level')
            ->whereNotNull('section')
            ->where('grade_level', '!=', '')
            ->where('section', '!=', '')
            ->select('grade_level', 'section')
            ->distinct()
            ->get();

        foreach ($pairs as $pair) {
            $grade = trim((string) $pair->grade_level);
            $section = trim((string) $pair->section);
            if ($grade === '' || $section === '') {
                continue;
            }

            $before = ClassSection::query()->count();
            $this->ensureClassSection($grade, $section, $year);
            if (ClassSection::query()->count() > $before) {
                $created++;
            }
        }

        return $created;
    }

    public function listTimetables(?int $classSectionId = null): Collection
    {
        $query = Timetable::query()
            ->with(['classSection', 'entries.course', 'entries.teacher.user'])
            ->withCount('entries');

        if ($classSectionId) {
            $query->where('class_section_id', $classSectionId);
        }

        return $query->orderByDesc('is_published')->orderByDesc('updated_at')->get();
    }

    public function getTimetable(Timetable $timetable, bool $withEntries = true): Timetable
    {
        $relations = ['classSection', 'creator'];

        if ($withEntries) {
            $relations[] = 'entries.course';
            $relations[] = 'entries.teacher.user';
        }

        return $timetable->load($relations);
    }

    public function createTimetable(array $data, User $admin): Timetable
    {
        $section = ClassSection::query()->findOrFail($data['class_section_id']);

        return Timetable::create([
            'class_section_id' => $section->id,
            'name' => $data['name'] ?? "Timetable — {$section->label}",
            'academic_year' => $data['academic_year'] ?? SystemSetting::get('academic_year'),
            'semester' => $data['semester'] ?? SystemSetting::get('current_semester'),
            'is_published' => false,
            'created_by' => $admin->id,
        ]);
    }

    public function duplicateTimetable(Timetable $source, User $admin, ?string $name = null): Timetable
    {
        $copy = Timetable::create([
            'class_section_id' => $source->class_section_id,
            'name' => $name ?? ($source->name.' (copie)'),
            'academic_year' => $source->academic_year,
            'semester' => $source->semester,
            'is_published' => false,
            'created_by' => $admin->id,
        ]);

        foreach ($source->entries as $entry) {
            TimetableEntry::create([
                'timetable_id' => $copy->id,
                'day_of_week' => $entry->day_of_week,
                'start_time' => $entry->start_time,
                'end_time' => $entry->end_time,
                'course_id' => $entry->course_id,
                'teacher_id' => $entry->teacher_id,
                'room' => $entry->room,
                'notes' => $entry->notes,
            ]);
        }

        return $this->getTimetable($copy);
    }

    public function publish(Timetable $timetable): Timetable
    {
        Timetable::query()
            ->where('class_section_id', $timetable->class_section_id)
            ->where('id', '!=', $timetable->id)
            ->update(['is_published' => false]);

        $timetable->update(['is_published' => true]);

        return $this->getTimetable($timetable->fresh());
    }

    public function upsertEntry(Timetable $timetable, array $data, ?int $entryId = null): TimetableEntry
    {
        $day = (int) $data['day_of_week'];
        $start = TimetablePeriods::normalizeTime($data['start_time']);
        $end = TimetablePeriods::normalizeTime($data['end_time']);

        $timeErrors = TimetablePeriods::validateSession($day, $start, $end);
        if ($timeErrors !== []) {
            throw ValidationException::withMessages($timeErrors);
        }

        $course = Course::query()->findOrFail($data['course_id']);
        $teacherId = $data['teacher_id'] ?? $course->teacher_id;

        $payload = [
            'timetable_id' => $timetable->id,
            'day_of_week' => $day,
            'start_time' => $start,
            'end_time' => $end,
            'course_id' => $course->id,
            'teacher_id' => $teacherId,
            'room' => $data['room'] ?? $course->room,
            'notes' => $data['notes'] ?? null,
        ];

        if ($entryId) {
            $entry = TimetableEntry::query()
                ->where('timetable_id', $timetable->id)
                ->findOrFail($entryId);
            $entry->update($payload);
        } else {
            $entry = TimetableEntry::updateOrCreate(
                [
                    'timetable_id' => $timetable->id,
                    'day_of_week' => $day,
                    'start_time' => $start,
                    'end_time' => $end,
                ],
                $payload
            );
        }

        return $entry->load(['course', 'teacher.user']);
    }

    public function moveEntry(TimetableEntry $entry, int $day, string $start, string $end): TimetableEntry
    {
        return $this->upsertEntry($entry->timetable, [
            'day_of_week' => $day,
            'start_time' => $start,
            'end_time' => $end,
            'course_id' => $entry->course_id,
            'teacher_id' => $entry->teacher_id,
            'room' => $entry->room,
            'notes' => $entry->notes,
        ], $entry->id);
    }

    public function deleteEntry(TimetableEntry $entry): void
    {
        $entry->delete();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function detectConflicts(?Timetable $scope = null, ?TimetableEntry $ignoreEntry = null): Collection
    {
        $query = TimetableEntry::query()
            ->with(['timetable.classSection', 'course', 'teacher.user']);

        if ($scope) {
            $query->where('timetable_id', $scope->id);
        }

        $entries = $query->get();
        $conflicts = collect();

        foreach ($entries as $a) {
            if ($ignoreEntry && $a->id === $ignoreEntry->id) {
                continue;
            }

            foreach ($entries as $b) {
                if ($a->id >= $b->id) {
                    continue;
                }

                if ($ignoreEntry && ($a->id === $ignoreEntry->id || $b->id === $ignoreEntry->id)) {
                    continue;
                }

                if ($a->day_of_week !== $b->day_of_week) {
                    continue;
                }

                if (! $this->timesOverlap($a->start_time, $a->end_time, $b->start_time, $b->end_time)) {
                    continue;
                }

                if ($a->teacher_id && $b->teacher_id && $a->teacher_id === $b->teacher_id) {
                    $conflicts->push($this->conflictPayload('teacher', $a, $b));
                }

                if ($a->room && $b->room && strcasecmp(trim($a->room), trim($b->room)) === 0) {
                    $conflicts->push($this->conflictPayload('room', $a, $b));
                }

                if ($a->timetable_id === $b->timetable_id) {
                    $conflicts->push($this->conflictPayload('class_overlap', $a, $b));
                }
            }
        }

        // Cross-timetable conflicts (global)
        $global = TimetableEntry::query()
            ->with(['timetable.classSection', 'course', 'teacher.user'])
            ->when($scope, fn ($q) => $q->where('timetable_id', '!=', $scope->id))
            ->get();

        foreach ($entries as $local) {
            foreach ($global as $remote) {
                if ($local->day_of_week !== $remote->day_of_week) {
                    continue;
                }
                if (! $this->timesOverlap($local->start_time, $local->end_time, $remote->start_time, $remote->end_time)) {
                    continue;
                }
                if ($local->teacher_id && $remote->teacher_id && $local->teacher_id === $remote->teacher_id) {
                    $conflicts->push($this->conflictPayload('teacher_global', $local, $remote));
                }
                if ($local->room && $remote->room && strcasecmp(trim($local->room), trim($remote->room)) === 0) {
                    $conflicts->push($this->conflictPayload('room_global', $local, $remote));
                }
            }
        }

        return $conflicts->unique(fn ($c) => $c['type'].'-'.$c['entry_a_id'].'-'.$c['entry_b_id'])->values();
    }

    /**
     * Pairwise conflict detection within a pre-loaded entry set (e.g. one teacher's sessions).
     * Avoids loading and comparing every timetable entry in the database.
     *
     * @param  Collection<int, TimetableEntry>  $entries
     * @return Collection<int, array<string, mixed>>
     */
    public function detectConflictsInEntries(Collection $entries, ?TimetableEntry $ignoreEntry = null): Collection
    {
        $conflicts = collect();

        foreach ($entries as $a) {
            if ($ignoreEntry && $a->id === $ignoreEntry->id) {
                continue;
            }

            foreach ($entries as $b) {
                if ($a->id >= $b->id) {
                    continue;
                }

                if ($ignoreEntry && ($a->id === $ignoreEntry->id || $b->id === $ignoreEntry->id)) {
                    continue;
                }

                if ($a->day_of_week !== $b->day_of_week) {
                    continue;
                }

                if (! $this->timesOverlap($a->start_time, $a->end_time, $b->start_time, $b->end_time)) {
                    continue;
                }

                if ($a->teacher_id && $b->teacher_id && $a->teacher_id === $b->teacher_id) {
                    $conflicts->push($this->conflictPayload('teacher', $a, $b));
                }

                if ($a->room && $b->room && strcasecmp(trim($a->room), trim($b->room)) === 0) {
                    $conflicts->push($this->conflictPayload('room', $a, $b));
                }

                if ($a->timetable_id === $b->timetable_id) {
                    $conflicts->push($this->conflictPayload('class_overlap', $a, $b));
                }
            }
        }

        return $conflicts->unique(fn ($c) => $c['type'].'-'.$c['entry_a_id'].'-'.$c['entry_b_id'])->values();
    }

    public function gridPayload(Timetable $timetable): array
    {
        $timetable = $this->getTimetable($timetable);
        $cells = [];
        $byDay = [];

        foreach (TimetablePeriods::DAYS as $day) {
            $byDay[$day['value']] = [];
        }

        $sessions = $timetable->entries
            ->filter(fn ($e) => ($e->session_status ?? TimetableEntry::STATUS_SCHEDULED) !== TimetableEntry::STATUS_CANCELLED)
            ->sortBy(fn ($e) => $e->day_of_week * 10000 + (int) str_replace(':', '', TimetablePeriods::normalizeTime($e->start_time)))
            ->values();

        foreach ($sessions as $entry) {
            $formatted = $this->formatEntry($entry);
            $key = "{$entry->day_of_week}|".TimetablePeriods::normalizeTime($entry->start_time);
            $cells[$key] = $formatted;
            $byDay[$entry->day_of_week][] = $formatted;
        }

        return [
            'timetable' => $timetable,
            'class_section' => $timetable->classSection,
            'days' => TimetablePeriods::DAYS,
            'periods' => TimetablePeriods::PERIODS,
            'cells' => $cells,
            'sessions_by_day' => $byDay,
            'sessions' => $sessions->map(fn ($e) => $this->formatEntry($e))->values()->all(),
            'conflicts' => $this->detectConflicts($timetable),
        ];
    }

    public function forStudent(User $user): ?array
    {
        $student = $user->student;
        if (! $student) {
            return null;
        }

        $section = ClassSection::resolveForStudent($student);
        if (! $section) {
            return null;
        }

        $timetable = Timetable::query()
            ->where('class_section_id', $section->id)
            ->where('is_published', true)
            ->with(['entries.course', 'entries.teacher.user', 'classSection'])
            ->latest()
            ->first();

        if (! $timetable) {
            return null;
        }

        return array_merge($this->gridPayload($timetable), [
            'student' => [
                'grade_level' => $student->grade_level,
                'section' => $student->section,
            ],
        ]);
    }

    public function forTeacher(User $user): ?array
    {
        $teacher = $user->teacher;
        if (! $teacher) {
            return null;
        }

        $teacher->loadMissing('user');

        $entries = TimetableEntry::query()
            ->where('teacher_id', $teacher->id)
            ->whereNot('session_status', TimetableEntry::STATUS_CANCELLED)
            ->whereHas('timetable', fn ($q) => $q->where('is_published', true))
            ->with(['course', 'teacher.user', 'timetable.classSection', 'pendingRescheduleRequest'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        if ($entries->isEmpty()) {
            $entries = TimetableEntry::query()
                ->where('teacher_id', $teacher->id)
                ->whereNot('session_status', TimetableEntry::STATUS_CANCELLED)
                ->with(['course', 'teacher.user', 'timetable.classSection', 'pendingRescheduleRequest'])
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get();
        }

        $cells = [];
        foreach ($entries as $entry) {
            $key = "{$entry->day_of_week}|".TimetablePeriods::normalizeTime($entry->start_time);
            $cells[$key] = $this->formatEntry($entry);
        }

        return [
            'teacher' => [
                'id' => $teacher->id,
                'user' => $teacher->user ? [
                    'id' => $teacher->user->id,
                    'name' => $teacher->user->name,
                    'email' => $teacher->user->email,
                ] : null,
            ],
            'days' => TimetablePeriods::DAYS,
            'periods' => TimetablePeriods::PERIODS,
            'cells' => $cells,
            'sessions' => $entries->map(fn ($e) => $this->formatEntryPublic($e))->values()->all(),
            'reschedule_requests' => app(TimetableRescheduleService::class)
                ->listForTeacher($user)
                ->map(fn ($r) => app(TimetableRescheduleService::class)->formatRequest($r))
                ->values()
                ->all(),
        ];
    }

    public function overviewAllClasses(): array
    {
        $sections = ClassSection::query()
            ->where('is_active', true)
            ->with(['publishedTimetable' => fn ($q) => $q->withCount('entries')])
            ->orderBy('grade_level')
            ->orderBy('section')
            ->get();

        return $sections->map(fn ($s) => [
            'class_section' => $s,
            'timetable' => $s->publishedTimetable,
            'entries_count' => $s->publishedTimetable?->entries()->count() ?? 0,
        ])->all();
    }

    public function autoGenerateForSection(ClassSection $section, User $admin, bool $publish = true): array
    {
        return app(TimetableAutoGenerator::class)->generate($section, $admin, $publish);
    }

    public function coursesForSection(ClassSection $section): Collection
    {
        return Course::query()
            ->where('grade_level', $section->grade_level)
            ->where(function ($q) use ($section) {
                $q->whereNull('section')
                    ->orWhereRaw('LOWER(TRIM(section)) = ?', [strtolower(trim($section->section))]);
            })
            ->with('teacher.user')
            ->orderBy('name')
            ->get();
    }

    public function ensureClassSection(string $gradeLevel, string $section, ?string $year = null): ClassSection
    {
        return ClassSection::firstOrCreate(
            [
                'grade_level' => trim($gradeLevel),
                'section' => trim($section),
                'academic_year' => $year ?? SystemSetting::get('academic_year'),
            ],
            [
                'label' => ClassSection::labelFor($gradeLevel, $section),
                'is_active' => true,
            ]
        );
    }

    public function renderHtml(Timetable $timetable): string
    {
        $data = $this->gridPayload($timetable);

        return view('reports.timetable', $data)->render();
    }

    public function pdfDownload(Timetable $timetable): \Illuminate\Http\Response
    {
        $html = $this->renderHtml($timetable);
        $label = Str::slug($timetable->classSection->label ?? 'timetable');
        $filename = "emploi-du-temps-{$label}.pdf";

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->setOption(['isRemoteEnabled' => true, 'defaultFont' => 'DejaVu Sans']);

        return $pdf->download($filename);
    }

    protected function formatEntry(TimetableEntry $entry): array
    {
        return $this->formatEntryPublic($entry);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatEntryPublic(TimetableEntry $entry): array
    {
        $pending = $entry->relationLoaded('pendingRescheduleRequest')
            ? $entry->pendingRescheduleRequest
            : $entry->pendingRescheduleRequest()->first();

        return [
            'id' => $entry->id,
            'day_of_week' => $entry->day_of_week,
            'start_time' => TimetablePeriods::normalizeTime($entry->start_time),
            'end_time' => TimetablePeriods::normalizeTime($entry->end_time),
            'room' => $entry->room,
            'notes' => $entry->notes,
            'session_status' => $entry->session_status ?? TimetableEntry::STATUS_SCHEDULED,
            'pending_reschedule' => $pending ? [
                'id' => $pending->id,
                'status' => $pending->status,
                'proposed_day_of_week' => $pending->proposed_day_of_week,
                'proposed_start_time' => TimetablePeriods::normalizeTime($pending->proposed_start_time),
                'proposed_end_time' => TimetablePeriods::normalizeTime($pending->proposed_end_time),
            ] : null,
            'course' => $this->formatCourseSummary($entry->course),
            'teacher' => $this->formatTeacherSummary($entry->teacher),
            'class_section' => $this->formatClassSectionSummary($entry->timetable?->classSection),
            'timetable_id' => $entry->timetable_id,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function formatCourseSummary(?Course $course): ?array
    {
        if (! $course) {
            return null;
        }

        return [
            'id' => $course->id,
            'name' => $course->name,
            'code' => $course->code,
            'room' => $course->room,
            'grade_level' => $course->grade_level,
            'section' => $course->section,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function formatTeacherSummary(?Teacher $teacher): ?array
    {
        if (! $teacher) {
            return null;
        }

        $teacher->loadMissing('user');

        return [
            'id' => $teacher->id,
            'user' => $teacher->user ? [
                'id' => $teacher->user->id,
                'name' => $teacher->user->name,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function formatClassSectionSummary(?ClassSection $section): ?array
    {
        if (! $section) {
            return null;
        }

        return [
            'id' => $section->id,
            'label' => $section->label,
            'grade_level' => $section->grade_level,
            'section' => $section->section,
        ];
    }

    protected function timesOverlap($startA, $endA, $startB, $endB): bool
    {
        $a1 = strtotime(TimetablePeriods::normalizeTime($startA));
        $a2 = strtotime(TimetablePeriods::normalizeTime($endA));
        $b1 = strtotime(TimetablePeriods::normalizeTime($startB));
        $b2 = strtotime(TimetablePeriods::normalizeTime($endB));

        return $a1 < $b2 && $b1 < $a2;
    }

    protected function conflictPayload(string $type, TimetableEntry $a, TimetableEntry $b): array
    {
        return [
            'type' => $type,
            'entry_a_id' => $a->id,
            'entry_b_id' => $b->id,
            'day_of_week' => $a->day_of_week,
            'start_time' => TimetablePeriods::normalizeTime($a->start_time),
            'end_time' => TimetablePeriods::normalizeTime($a->end_time),
            'message' => $this->conflictMessage($type, $a, $b),
            'entry_a' => $this->formatEntry($a),
            'entry_b' => $this->formatEntry($b),
        ];
    }

    protected function conflictMessage(string $type, TimetableEntry $a, TimetableEntry $b): string
    {
        $slot = TimetablePeriods::normalizeTime($a->start_time).'–'.TimetablePeriods::normalizeTime($a->end_time);

        return match (true) {
            str_contains($type, 'teacher') => sprintf(
                'Teacher %s has overlapping sessions (%s).',
                $a->teacher?->user?->name ?? 'Unknown',
                $slot
            ),
            $type === 'class_overlap' => sprintf(
                'Class has overlapping sessions on %s (%s).',
                $this->dayLabel($a->day_of_week),
                $slot
            ),
            default => sprintf(
                'Classroom %s has overlapping sessions (%s).',
                $a->room,
                $slot
            ),
        };
    }

    protected function dayLabel(int $day): string
    {
        foreach (TimetablePeriods::DAYS as $d) {
            if ($d['value'] === $day) {
                return $d['label'];
            }
        }

        return "Day {$day}";
    }
}
