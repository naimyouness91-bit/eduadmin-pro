<?php

namespace App\Services;

use App\Models\Course;
use App\Models\MeetingAttendanceLog;
use App\Models\MeetingParticipant;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Models\VirtualMeeting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class VirtualMeetingService
{
    public function __construct(
        protected JitsiMeetService $jitsi,
        protected NotificationService $notificationService
    ) {}

    public function canAccess(User $user, VirtualMeeting $meeting): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        return $meeting->participants()->where('user_id', $user->id)->exists();
    }

    public function canManage(User $user, VirtualMeeting $meeting): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ((int) $meeting->created_by === (int) $user->id) {
            return true;
        }

        if ($user->isTeacher() && $meeting->course_id) {
            return Course::where('id', $meeting->course_id)
                ->where('teacher_id', $user->teacher?->id)
                ->exists();
        }

        return $meeting->participants()
            ->where('user_id', $user->id)
            ->whereIn('role', [MeetingParticipant::ROLE_HOST, MeetingParticipant::ROLE_MODERATOR])
            ->exists();
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return $query;
        }

        return $query->whereHas('participants', fn ($q) => $q->where('user_id', $user->id));
    }

    public function create(User $creator, array $data): VirtualMeeting
    {
        return DB::transaction(function () use ($creator, $data) {
            $roomName = $this->jitsi->generateRoomName($data['title'] ?? 'meeting');

            $meeting = VirtualMeeting::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'course_id' => $data['course_id'] ?? null,
                'created_by' => $creator->id,
                'jitsi_room_name' => $roomName,
                'scheduled_at' => $data['scheduled_at'] ?? null,
                'ends_at' => $data['ends_at'] ?? null,
                'status' => $data['status'] ?? VirtualMeeting::STATUS_SCHEDULED,
                'settings' => $data['settings'] ?? [],
            ]);

            $hostRole = $creator->hasRole(['super_admin', 'admin', 'teacher'])
                ? MeetingParticipant::ROLE_HOST
                : MeetingParticipant::ROLE_MODERATOR;

            $this->addParticipant($meeting, $creator, $hostRole);

            if (! empty($data['user_ids'])) {
                $this->inviteUsers($meeting, $data['user_ids'], $creator);
            }

            if (! empty($data['student_ids'])) {
                $this->inviteStudents($meeting, $data['student_ids'], $creator, $data['course_id'] ?? null);
            }

            if (! empty($data['teacher_ids'])) {
                $this->inviteTeachers($meeting, $data['teacher_ids'], $creator);
            }

            if (! empty($data['course_id']) && ($data['invite_course_students'] ?? false)) {
                $this->inviteCourseStudents($meeting, (int) $data['course_id']);
            }

            return $meeting->fresh(['creator', 'course', 'participants.user']);
        });
    }

    public function addParticipant(
        VirtualMeeting $meeting,
        User $user,
        string $role = MeetingParticipant::ROLE_PARTICIPANT
    ): MeetingParticipant {
        return MeetingParticipant::updateOrCreate(
            [
                'virtual_meeting_id' => $meeting->id,
                'user_id' => $user->id,
            ],
            [
                'role' => $role,
                'invited_at' => now(),
            ]
        );
    }

    /**
     * @param  array<int, int>  $userIds
     */
    public function inviteUsers(VirtualMeeting $meeting, array $userIds, User $inviter): void
    {
        foreach (array_unique($userIds) as $userId) {
            $user = User::find($userId);
            if ($user && $user->id !== $inviter->id) {
                $this->addParticipant($meeting, $user);
                $this->notifyInvite($meeting, $user, $inviter);
            }
        }
    }

    /**
     * @param  array<int, int>  $studentIds
     */
    public function inviteStudents(
        VirtualMeeting $meeting,
        array $studentIds,
        User $inviter,
        ?int $courseId = null
    ): void {
        foreach (array_unique($studentIds) as $studentId) {
            if ($courseId && ! $this->studentEnrolledInCourse((int) $studentId, $courseId)) {
                continue;
            }

            $student = Student::find($studentId);
            if ($student?->user) {
                $this->addParticipant($meeting, $student->user);
                $this->notifyInvite($meeting, $student->user, $inviter);
            }
        }
    }

    /**
     * @param  array<int, int>  $teacherIds
     */
    public function inviteTeachers(VirtualMeeting $meeting, array $teacherIds, User $inviter): void
    {
        foreach (array_unique($teacherIds) as $teacherId) {
            $teacher = Teacher::find($teacherId);
            if ($teacher?->user && $teacher->user_id !== $inviter->id) {
                $this->addParticipant($meeting, $teacher->user, MeetingParticipant::ROLE_MODERATOR);
                $this->notifyInvite($meeting, $teacher->user, $inviter);
            }
        }
    }

    public function inviteCourseStudents(VirtualMeeting $meeting, int $courseId): void
    {
        $course = Course::with('students.user')->find($courseId);
        if (! $course) {
            return;
        }

        foreach ($course->students as $student) {
            if ($student->user) {
                $this->addParticipant($meeting, $student->user);
            }
        }
    }

    public function recordJoin(VirtualMeeting $meeting, User $user): MeetingParticipant
    {
        $participant = $this->addParticipant($meeting, $user);

        if (! $participant->joined_at || $participant->left_at) {
            $participant->update([
                'joined_at' => now(),
                'left_at' => null,
            ]);
        }

        if ($meeting->status === VirtualMeeting::STATUS_SCHEDULED) {
            $meeting->update(['status' => VirtualMeeting::STATUS_LIVE]);
        }

        MeetingAttendanceLog::create([
            'virtual_meeting_id' => $meeting->id,
            'user_id' => $user->id,
            'joined_at' => now(),
        ]);

        return $participant->fresh();
    }

    public function recordLeave(VirtualMeeting $meeting, User $user): void
    {
        $participant = $meeting->participants()->where('user_id', $user->id)->first();
        if (! $participant) {
            return;
        }

        $leftAt = now();
        $duration = 0;

        if ($participant->joined_at) {
            $duration = max(0, $participant->joined_at->diffInSeconds($leftAt));
        }

        $participant->update([
            'left_at' => $leftAt,
            'total_duration_seconds' => $participant->total_duration_seconds + $duration,
            'hand_raised' => false,
        ]);

        $openLog = MeetingAttendanceLog::query()
            ->where('virtual_meeting_id', $meeting->id)
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->latest('joined_at')
            ->first();

        if ($openLog) {
            $openLog->update(['left_at' => $leftAt]);
        }
    }

    public function setHandRaised(VirtualMeeting $meeting, User $user, bool $raised): void
    {
        $meeting->participants()
            ->where('user_id', $user->id)
            ->update(['hand_raised' => $raised]);
    }

    public function participantRole(VirtualMeeting $meeting, User $user): string
    {
        return $meeting->participants()
            ->where('user_id', $user->id)
            ->value('role') ?? MeetingParticipant::ROLE_PARTICIPANT;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function attendanceSummary(VirtualMeeting $meeting): array
    {
        return $meeting->participants()
            ->with('user:id,name,email,avatar,role')
            ->get()
            ->map(fn (MeetingParticipant $p) => [
                'user' => $p->user,
                'role' => $p->role,
                'invited_at' => $p->invited_at,
                'joined_at' => $p->joined_at,
                'left_at' => $p->left_at,
                'total_duration_seconds' => $p->total_duration_seconds,
                'attended' => (bool) $p->joined_at,
                'hand_raised' => $p->hand_raised,
            ])
            ->values()
            ->all();
    }

    protected function studentEnrolledInCourse(int $studentId, int $courseId): bool
    {
        return Student::query()
            ->where('id', $studentId)
            ->whereHas('courses', fn ($q) => $q->where('courses.id', $courseId))
            ->exists();
    }

    protected function notifyInvite(VirtualMeeting $meeting, User $user, User $inviter): void
    {
        $this->notificationService->notifyUser(
            $user,
            NotificationService::CATEGORY_MEETING,
            'Virtual meeting invitation',
            "{$inviter->name} invited you to: {$meeting->title}",
            ['meeting_id' => $meeting->id]
        );
    }
}
