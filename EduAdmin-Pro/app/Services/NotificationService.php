<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Grade;
use App\Models\Student;
use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    public const CATEGORY_ATTENDANCE = 'attendance';

    public const CATEGORY_GRADE = 'grade';

    public const CATEGORY_MESSAGE = 'message';

    public const CATEGORY_EVENT = 'event';

    public const CATEGORY_SYSTEM = 'system';

    public const CATEGORY_GROUP = 'group';

    public const CATEGORY_MEETING = 'meeting';

    public const CATEGORY_TIMETABLE = 'timetable';

    public const HIGH_ABSENCE_THRESHOLD = 75;

    public function notifyUser(User $user, string $category, string $title, string $body, array $meta = []): void
    {
        $user->notify(new SystemNotification($category, $title, $body, $meta));
    }

    public function hasRecentNotification(User $user, string $category, array $metaMatch = [], int $hours = 24): bool
    {
        return $user->notifications()
            ->where('created_at', '>=', now()->subHours($hours))
            ->get()
            ->contains(function ($notification) use ($category, $metaMatch) {
                $data = $notification->data ?? [];

                if (($data['category'] ?? null) !== $category) {
                    return false;
                }

                $meta = $data['meta'] ?? [];

                foreach ($metaMatch as $key => $value) {
                    if (($meta[$key] ?? null) != $value) {
                        return false;
                    }
                }

                return true;
            });
    }

    public function notifyGradePosted(Grade $grade): void
    {
        $grade->load(['student.user', 'student.parents.user', 'course']);
        $studentUser = $grade->student?->user;
        if ($studentUser) {
            $this->notifyUser(
                $studentUser,
                self::CATEGORY_GRADE,
                'New grade posted',
                "You received a grade for {$grade->course?->name}: {$grade->score}/{$grade->max_score}",
                ['grade_id' => $grade->id, 'course_id' => $grade->course_id]
            );
        }

        foreach ($grade->student?->parents ?? [] as $parent) {
            if ($parent->user) {
                $this->notifyUser(
                    $parent->user,
                    self::CATEGORY_GRADE,
                    'New grade for your child',
                    "{$grade->student->user?->name} received a grade in {$grade->course?->name}.",
                    ['grade_id' => $grade->id, 'student_id' => $grade->student_id]
                );
            }
        }
    }

    public function notifyHighAbsence(Student $student, float $rate): void
    {
        if ($rate >= self::HIGH_ABSENCE_THRESHOLD) {
            return;
        }

        $meta = ['student_id' => $student->id, 'attendance_rate' => $rate];

        foreach ($student->parents as $parent) {
            if (! $parent->user) {
                continue;
            }

            if ($this->hasRecentNotification($parent->user, self::CATEGORY_ATTENDANCE, $meta)) {
                continue;
            }

            $this->notifyUser(
                $parent->user,
                self::CATEGORY_ATTENDANCE,
                'High absence rate alert',
                "{$student->user?->name}'s attendance is {$rate}% (below ".self::HIGH_ABSENCE_THRESHOLD.'%).',
                $meta
            );
        }

        if ($student->user && ! $this->hasRecentNotification($student->user, self::CATEGORY_ATTENDANCE, $meta)) {
            $this->notifyUser(
                $student->user,
                self::CATEGORY_ATTENDANCE,
                'Attendance alert',
                "Your attendance rate is {$rate}%. Please review your records.",
                $meta
            );
        }

        User::query()
            ->where('is_active', true)
            ->whereIn('role', ['super_admin', 'admin'])
            ->each(function (User $admin) use ($student, $rate, $meta) {
                if ($this->hasRecentNotification($admin, self::CATEGORY_ATTENDANCE, $meta)) {
                    return;
                }

                $this->notifyUser(
                    $admin,
                    self::CATEGORY_ATTENDANCE,
                    'Student attendance alert',
                    "{$student->user?->name}'s attendance dropped to {$rate}%.",
                    $meta
                );
            });
    }

    public function notifyNewMessage(User $receiver, User $sender, string $preview): void
    {
        $this->notifyUser(
            $receiver,
            self::CATEGORY_MESSAGE,
            'New message',
            "{$sender->name}: {$preview}",
            ['sender_id' => $sender->id]
        );
    }

    public function broadcastEventCreated(Event $event): void
    {
        $query = User::query()->where('is_active', true);

        if ($event->is_public) {
            $query->whereIn('role', ['super_admin', 'admin', 'teacher', 'student', 'parent']);
        } else {
            $query->whereIn('role', ['super_admin', 'admin']);
        }

        $users = $query->get();

        Notification::send($users, new SystemNotification(
            self::CATEGORY_EVENT,
            'New school event',
            $event->title,
            [
                'event_id' => $event->id,
                'event_type' => $event->type,
                'start_date' => $event->start_date?->toIso8601String(),
            ]
        ));
    }

    public function systemAlert(User $user, string $title, string $body, array $meta = []): void
    {
        $this->notifyUser($user, self::CATEGORY_SYSTEM, $title, $body, $meta);
    }

    public function broadcastSystemAlert(string $title, string $body, array $roles = ['super_admin', 'admin', 'teacher', 'student', 'parent']): void
    {
        $users = User::query()
            ->where('is_active', true)
            ->whereIn('role', $roles)
            ->get();

        Notification::send($users, new SystemNotification(self::CATEGORY_SYSTEM, $title, $body));
    }

    public function notifyRescheduleRequestSubmitted(\App\Models\TimetableRescheduleRequest $request): void
    {
        $request->loadMissing(['entry.course', 'entry.teacher.user', 'entry.timetable.classSection', 'requester']);

        $entry = $request->entry;
        $teacherName = $entry?->teacher?->user?->name ?? $request->requester?->name ?? 'A teacher';
        $course = $entry?->course?->name ?? 'a session';
        $classLabel = $entry?->timetable?->classSection?->label ?? '';

        $meta = [
            'request_id' => $request->id,
            'entry_id' => $request->timetable_entry_id,
            'timetable_id' => $entry?->timetable_id,
        ];

        User::query()
            ->where('is_active', true)
            ->whereIn('role', ['super_admin', 'admin'])
            ->each(function (User $admin) use ($teacherName, $course, $classLabel, $meta) {
                $this->notifyUser(
                    $admin,
                    self::CATEGORY_TIMETABLE,
                    'Session reschedule request',
                    "{$teacherName} requested to reschedule {$course}".($classLabel ? " ({$classLabel})" : '').'.',
                    $meta
                );
            });
    }

    public function notifyRescheduleRequestReviewed(\App\Models\TimetableRescheduleRequest $request): void
    {
        $request->loadMissing(['entry.course', 'requester']);

        $requester = $request->requester;
        if (! $requester) {
            return;
        }

        $course = $request->entry?->course?->name ?? 'your session';
        $approved = $request->status === \App\Models\TimetableRescheduleRequest::STATUS_APPROVED;

        $this->notifyUser(
            $requester,
            self::CATEGORY_TIMETABLE,
            $approved ? 'Reschedule approved' : 'Reschedule rejected',
            $approved
                ? "Your reschedule request for {$course} was approved."
                : "Your reschedule request for {$course} was rejected.",
            [
                'request_id' => $request->id,
                'entry_id' => $request->timetable_entry_id,
                'status' => $request->status,
            ]
        );
    }
}
