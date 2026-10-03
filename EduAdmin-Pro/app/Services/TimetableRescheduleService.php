<?php

namespace App\Services;

use App\Models\TimetableEntry;
use App\Models\TimetableRescheduleRequest;
use App\Models\User;
use App\Support\TimetablePeriods;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TimetableRescheduleService
{
    public function __construct(
        protected TimetableService $timetableService,
        protected NotificationService $notificationService
    ) {}

    /**
     * @return Collection<int, TimetableEntry>
     */
    public function upcomingSessionsForTeacher(User $user): Collection
    {
        $teacher = $user->teacher;
        if (! $teacher) {
            return collect();
        }

        return TimetableEntry::query()
            ->where('teacher_id', $teacher->id)
            ->whereIn('session_status', [
                TimetableEntry::STATUS_SCHEDULED,
                TimetableEntry::STATUS_RESCHEDULED,
            ])
            ->whereHas('timetable', fn ($q) => $q->where('is_published', true))
            ->whereDoesntHave('pendingRescheduleRequest')
            ->with(['course', 'teacher.user', 'timetable.classSection'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAvailableSlots(TimetableEntry $entry, User $user): array
    {
        $this->assertTeacherOwnsEntry($entry, $user);

        $entry->load(['timetable', 'course', 'teacher.user']);
        $this->assertEntryCanBeRescheduled($entry);

        $available = [];

        foreach (TimetablePeriods::weekdaySlots() as $slot) {
            if ($this->isSameSlot($entry, $slot)) {
                continue;
            }

            if ($this->isSlotFreeForMove($entry, $slot)) {
                $available[] = $this->formatSlotOption($slot, $entry);
            }
        }

        return $available;
    }

    public function createRequest(
        TimetableEntry $entry,
        User $teacherUser,
        int $proposedDay,
        string $proposedStart,
        string $proposedEnd,
        ?string $reason = null
    ): TimetableRescheduleRequest {
        $this->assertTeacherOwnsEntry($entry, $teacherUser);
        $this->assertEntryCanBeRescheduled($entry);

        $proposedStart = TimetablePeriods::normalizeTime($proposedStart);
        $proposedEnd = TimetablePeriods::normalizeTime($proposedEnd);

        $timeErrors = TimetablePeriods::validateSession($proposedDay, $proposedStart, $proposedEnd);
        if ($timeErrors !== []) {
            throw ValidationException::withMessages($timeErrors);
        }

        $slot = [
            'day' => $proposedDay,
            'start' => $proposedStart,
            'end' => $proposedEnd,
            'band' => TimetablePeriods::bandForTime($proposedStart),
        ];

        if (! $this->isSlotFreeForMove($entry, $slot)) {
            throw ValidationException::withMessages([
                'proposed_slot' => 'The selected slot is no longer available.',
            ]);
        }

        $request = TimetableRescheduleRequest::create([
            'timetable_entry_id' => $entry->id,
            'requested_by' => $teacherUser->id,
            'status' => TimetableRescheduleRequest::STATUS_PENDING,
            'reason' => $reason,
            'original_day_of_week' => $entry->day_of_week,
            'original_start_time' => TimetablePeriods::normalizeTime($entry->start_time),
            'original_end_time' => TimetablePeriods::normalizeTime($entry->end_time),
            'proposed_day_of_week' => $proposedDay,
            'proposed_start_time' => $proposedStart,
            'proposed_end_time' => $proposedEnd,
            'proposed_room' => $entry->room,
        ]);

        $request->load(['entry.course', 'entry.timetable.classSection', 'entry.teacher.user', 'requester']);

        $this->notificationService->notifyRescheduleRequestSubmitted($request);

        return $request;
    }

    public function approveRequest(TimetableRescheduleRequest $request, User $admin, ?string $adminNotes = null): TimetableRescheduleRequest
    {
        if ($request->status !== TimetableRescheduleRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'status' => 'This request has already been processed.',
            ]);
        }

        $entry = $request->entry()->with(['timetable', 'course'])->firstOrFail();

        $slot = [
            'day' => $request->proposed_day_of_week,
            'start' => TimetablePeriods::normalizeTime($request->proposed_start_time),
            'end' => TimetablePeriods::normalizeTime($request->proposed_end_time),
        ];

        if (! $this->isSlotFreeForMove($entry, $slot)) {
            throw ValidationException::withMessages([
                'proposed_slot' => 'Cannot approve: the proposed slot is no longer available.',
            ]);
        }

        DB::transaction(function () use ($request, $entry, $admin, $adminNotes, $slot) {
            $this->timetableService->moveEntry(
                $entry,
                $slot['day'],
                $slot['start'],
                $slot['end']
            );

            $entry->refresh()->update([
                'session_status' => TimetableEntry::STATUS_RESCHEDULED,
                'room' => $request->proposed_room ?? $entry->room,
            ]);

            $conflicts = $this->timetableService->detectConflicts($entry->timetable);
            if ($conflicts->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'conflicts' => $conflicts->values()->all(),
                ]);
            }

            $request->update([
                'status' => TimetableRescheduleRequest::STATUS_APPROVED,
                'admin_notes' => $adminNotes,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);
        });

        $request->refresh()->load([
            'entry.course',
            'entry.timetable.classSection',
            'entry.teacher.user',
            'requester',
            'reviewer',
        ]);

        $this->notificationService->notifyRescheduleRequestReviewed($request);

        return $request;
    }

    public function rejectRequest(TimetableRescheduleRequest $request, User $admin, ?string $adminNotes = null): TimetableRescheduleRequest
    {
        if ($request->status !== TimetableRescheduleRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'status' => 'This request has already been processed.',
            ]);
        }

        $request->update([
            'status' => TimetableRescheduleRequest::STATUS_REJECTED,
            'admin_notes' => $adminNotes,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $request->load([
            'entry.course',
            'entry.timetable.classSection',
            'entry.teacher.user',
            'requester',
            'reviewer',
        ]);

        $this->notificationService->notifyRescheduleRequestReviewed($request);

        return $request;
    }

    public function cancelRequest(TimetableRescheduleRequest $request, User $teacherUser): TimetableRescheduleRequest
    {
        if ($request->status !== TimetableRescheduleRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Only pending requests can be cancelled.',
            ]);
        }

        if ((int) $request->requested_by !== (int) $teacherUser->id) {
            abort(403, 'Forbidden.');
        }

        $request->update(['status' => TimetableRescheduleRequest::STATUS_CANCELLED]);

        return $request->fresh();
    }

    /**
     * @return Collection<int, TimetableRescheduleRequest>
     */
    public function listForTeacher(User $user): Collection
    {
        return TimetableRescheduleRequest::query()
            ->where('requested_by', $user->id)
            ->with(['entry.course', 'entry.timetable.classSection', 'entry.teacher.user', 'reviewer'])
            ->latest()
            ->get();
    }

    /**
     * @return Collection<int, TimetableRescheduleRequest>
     */
    public function listForAdmin(?string $status = null): Collection
    {
        $query = TimetableRescheduleRequest::query()
            ->with(['entry.course', 'entry.timetable.classSection', 'entry.teacher.user', 'requester', 'reviewer'])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function formatRequest(TimetableRescheduleRequest $request): array
    {
        $entry = $request->entry;

        return [
            'id' => $request->id,
            'status' => $request->status,
            'reason' => $request->reason,
            'admin_notes' => $request->admin_notes,
            'created_at' => $request->created_at,
            'reviewed_at' => $request->reviewed_at,
            'original_session' => [
                'day_of_week' => $request->original_day_of_week,
                'start_time' => TimetablePeriods::normalizeTime($request->original_start_time),
                'end_time' => TimetablePeriods::normalizeTime($request->original_end_time),
                'room' => $entry?->room,
            ],
            'proposed_session' => [
                'day_of_week' => $request->proposed_day_of_week,
                'start_time' => TimetablePeriods::normalizeTime($request->proposed_start_time),
                'end_time' => TimetablePeriods::normalizeTime($request->proposed_end_time),
                'room' => $request->proposed_room ?? $entry?->room,
            ],
            'entry' => $entry ? $this->timetableService->formatEntryPublic($entry) : null,
            'requester' => $request->requester ? [
                'id' => $request->requester->id,
                'name' => $request->requester->name,
            ] : null,
            'reviewer' => $request->reviewer ? [
                'id' => $request->reviewer->id,
                'name' => $request->reviewer->name,
            ] : null,
        ];
    }

    protected function isSlotFreeForMove(TimetableEntry $entry, array $slot): bool
    {
        $teacherId = $entry->teacher_id;
        $room = trim((string) ($entry->room ?? ''));
        $timetableId = $entry->timetable_id;

        $classEntries = TimetableEntry::query()
            ->where('timetable_id', $timetableId)
            ->where('id', '!=', $entry->id)
            ->where('day_of_week', $slot['day'])
            ->whereNot('session_status', TimetableEntry::STATUS_CANCELLED)
            ->get();

        foreach ($classEntries as $other) {
            if ($this->timesOverlap($slot, $other)) {
                return false;
            }
        }

        if ($teacherId) {
            $teacherEntries = TimetableEntry::query()
                ->where('teacher_id', $teacherId)
                ->where('id', '!=', $entry->id)
                ->where('day_of_week', $slot['day'])
                ->whereNot('session_status', TimetableEntry::STATUS_CANCELLED)
                ->get();

            foreach ($teacherEntries as $other) {
                if ($this->timesOverlap($slot, $other)) {
                    return false;
                }
            }
        }

        if ($room !== '') {
            $roomEntries = TimetableEntry::query()
                ->whereRaw('LOWER(TRIM(room)) = ?', [strtolower($room)])
                ->where('id', '!=', $entry->id)
                ->where('day_of_week', $slot['day'])
                ->whereNot('session_status', TimetableEntry::STATUS_CANCELLED)
                ->get();

            foreach ($roomEntries as $other) {
                if ($this->timesOverlap($slot, $other)) {
                    return false;
                }
            }
        }

        return true;
    }

    protected function timesOverlap(array $slot, TimetableEntry $entry): bool
    {
        $a1 = strtotime(TimetablePeriods::normalizeTime($slot['start']));
        $a2 = strtotime(TimetablePeriods::normalizeTime($slot['end']));
        $b1 = strtotime(TimetablePeriods::normalizeTime($entry->start_time));
        $b2 = strtotime(TimetablePeriods::normalizeTime($entry->end_time));

        return $a1 < $b2 && $b1 < $a2;
    }

    protected function isSameSlot(TimetableEntry $entry, array $slot): bool
    {
        return (int) $entry->day_of_week === (int) $slot['day']
            && TimetablePeriods::normalizeTime($entry->start_time) === $slot['start'];
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatSlotOption(array $slot, TimetableEntry $entry): array
    {
        $dayMeta = collect(TimetablePeriods::DAYS)->firstWhere('value', $slot['day']);

        return [
            'day_of_week' => $slot['day'],
            'day_label' => $dayMeta['label'] ?? "Day {$slot['day']}",
            'day_label_fr' => $dayMeta['label_fr'] ?? $dayMeta['label'] ?? '',
            'start_time' => $slot['start'],
            'end_time' => $slot['end'],
            'band' => $slot['band'],
            'label' => ($dayMeta['label'] ?? '').' '.$slot['start'].'–'.$slot['end'],
            'room' => $entry->room,
        ];
    }

    protected function assertTeacherOwnsEntry(TimetableEntry $entry, ?User $user): void
    {
        if (! $user?->teacher || (int) $entry->teacher_id !== (int) $user->teacher->id) {
            abort(403, 'You can only reschedule your own sessions.');
        }
    }

    protected function assertEntryCanBeRescheduled(TimetableEntry $entry): void
    {
        if (! in_array($entry->session_status, [
            TimetableEntry::STATUS_SCHEDULED,
            TimetableEntry::STATUS_RESCHEDULED,
        ], true)) {
            throw ValidationException::withMessages([
                'entry' => 'This session cannot be rescheduled.',
            ]);
        }

        if ($entry->pendingRescheduleRequest()->exists()) {
            throw ValidationException::withMessages([
                'entry' => 'A reschedule request is already pending for this session.',
            ]);
        }
    }
}
