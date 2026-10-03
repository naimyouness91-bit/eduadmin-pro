<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GroupService
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function canAccessGroup(User $user, Group $group): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        return $group->members()->where('user_id', $user->id)->exists();
    }

    public function canManageGroup(User $user, Group $group): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ($user->isTeacher() && (int) $group->created_by === (int) $user->id) {
            return true;
        }

        if ($user->isTeacher() && $group->type === Group::TYPE_COURSE && $group->course_id) {
            $teacherId = $user->teacher?->id;

            return $teacherId && Course::where('id', $group->course_id)
                ->where('teacher_id', $teacherId)
                ->exists();
        }

        $membership = $this->membership($user, $group);

        return $membership?->isModerator() ?? false;
    }

    public function canSendMessage(User $user, Group $group): bool
    {
        if (! $this->canAccessGroup($user, $group)) {
            return false;
        }

        if ($this->canManageGroup($user, $group)) {
            return true;
        }

        if ($user->isStudent() && ! $group->allow_student_messages) {
            return false;
        }

        $membership = $this->membership($user, $group);

        return $membership?->can_send_messages ?? false;
    }

    public function canUploadFile(User $user, Group $group): bool
    {
        if (! $this->canAccessGroup($user, $group)) {
            return false;
        }

        if ($this->canManageGroup($user, $group)) {
            return true;
        }

        if ($user->isStudent() && ! $group->allow_student_files) {
            return false;
        }

        $membership = $this->membership($user, $group);

        return $membership?->can_upload_files ?? false;
    }

    public function membership(User $user, Group $group): ?GroupMember
    {
        return $group->members()->where('user_id', $user->id)->first();
    }

    public function scopeGroupsForUser($query, User $user)
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return $query;
        }

        return $query->whereHas('members', fn ($q) => $q->where('user_id', $user->id));
    }

    public function teacherOwnsCourse(User $user, int $courseId): bool
    {
        if (! $user->isTeacher() || ! $user->teacher) {
            return false;
        }

        return Course::where('id', $courseId)
            ->where('teacher_id', $user->teacher->id)
            ->exists();
    }

    public function studentEnrolledInCourse(int $studentId, int $courseId): bool
    {
        return Student::query()
            ->where('id', $studentId)
            ->whereHas('courses', fn ($q) => $q->where('courses.id', $courseId))
            ->exists();
    }

    /**
     * @param  array<int, int>  $studentIds
     * @return array<int, int>
     */
    public function filterStudentIdsForCourse(array $studentIds, int $courseId): array
    {
        return array_values(array_filter($studentIds, fn ($id) => $this->studentEnrolledInCourse((int) $id, $courseId)));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function teacherPresets(User $user): array
    {
        if (! $user->isTeacher() || ! $user->teacher) {
            return [];
        }

        return $user->teacher->courses()
            ->orderBy('name')
            ->get()
            ->map(fn (Course $course) => [
                'id' => 'course_'.$course->id,
                'name' => $course->name.' Group',
                'description' => "Course group for {$course->name} — enrolled students only",
                'type' => Group::TYPE_COURSE,
                'course_id' => $course->id,
                'course_name' => $course->name,
                'course_code' => $course->code,
            ])
            ->values()
            ->all();
    }

    /**
     * @return \Illuminate\Support\Collection<int, Student>
     */
    public function eligibleStudentsForGroup(Group $group): Collection
    {
        if (! $group->course_id) {
            return collect();
        }

        $course = Course::with(['students.user'])->find($group->course_id);

        return $course?->students ?? collect();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function addMembersFromRequest(Group $group, User $actor, array $data): void
    {
        $isTeacherOnly = $actor->isTeacher() && ! $actor->hasRole(['super_admin', 'admin']);

        if ($isTeacherOnly) {
            if (! empty($data['teacher_ids']) || ! empty($data['user_ids'])) {
                throw new \InvalidArgumentException('Teachers can only add students from their course.');
            }

            if ($group->type !== Group::TYPE_COURSE || ! $group->course_id) {
                throw new \InvalidArgumentException('This group is not linked to a course.');
            }

            if (! $this->teacherOwnsCourse($actor, (int) $group->course_id)
                && (int) $group->created_by !== (int) $actor->id) {
                throw new \InvalidArgumentException('You can only manage groups for your assigned courses.');
            }
        }

        if (! empty($data['user_ids'])) {
            foreach ($data['user_ids'] as $userId) {
                $user = User::find($userId);
                if ($user) {
                    $this->addMember($group, $user);
                }
            }
        }

        if (! empty($data['student_ids'])) {
            $studentIds = $data['student_ids'];

            if ($group->course_id) {
                $studentIds = $this->filterStudentIdsForCourse($studentIds, (int) $group->course_id);
            }

            if ($isTeacherOnly && count($studentIds) !== count($data['student_ids'])) {
                throw new \InvalidArgumentException('One or more students are not enrolled in this course.');
            }

            foreach ($studentIds as $studentId) {
                $student = Student::find($studentId);
                if ($student?->user) {
                    $this->addMember($group, $student->user);
                }
            }
        }

        if (! empty($data['teacher_ids']) && ! $isTeacherOnly) {
            foreach ($data['teacher_ids'] as $teacherId) {
                $teacher = Teacher::find($teacherId);
                if ($teacher?->user) {
                    $this->addMember($group, $teacher->user, GroupMember::ROLE_MODERATOR, true, true);
                }
            }
        }
    }

    public function addMember(
        Group $group,
        User $memberUser,
        string $role = GroupMember::ROLE_MEMBER,
        ?bool $canSend = null,
        ?bool $canUpload = null
    ): GroupMember {
        $defaults = $this->defaultMemberPermissions($memberUser, $group, $role);

        return GroupMember::updateOrCreate(
            ['group_id' => $group->id, 'user_id' => $memberUser->id],
            [
                'role' => $role,
                'can_send_messages' => $canSend ?? $defaults['can_send_messages'],
                'can_upload_files' => $canUpload ?? $defaults['can_upload_files'],
                'joined_at' => now(),
            ]
        );
    }

    /**
     * @param  array<int, int>  $userIds
     */
    public function syncMembers(Group $group, array $userIds, User $actor): void
    {
        $userIds = array_unique(array_filter($userIds));

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            if ($user) {
                $this->addMember($group, $user);
            }
        }
    }

    /**
     * Admin presets for quick student / mixed group creation.
     *
     * @return array<int, array<string, mixed>>
     */
    public function adminPresets(): array
    {
        return [
            [
                'id' => 'all_students',
                'name' => 'All Students',
                'description' => 'Every active student in the school',
                'type' => Group::TYPE_STUDENT,
                'audience' => Group::AUDIENCE_ALL_STUDENTS,
            ],
            [
                'id' => 'final_year',
                'name' => 'Final Year Students',
                'description' => 'Students in final year grade levels (e.g. Grade 12)',
                'type' => Group::TYPE_STUDENT,
                'audience' => Group::AUDIENCE_FINAL_YEAR,
            ],
            [
                'id' => 'scholarship',
                'name' => 'Scholarship Students',
                'description' => 'Students marked as scholarship recipients',
                'type' => Group::TYPE_STUDENT,
                'audience' => Group::AUDIENCE_SCHOLARSHIP,
            ],
            [
                'id' => 'teachers_students',
                'name' => 'Teachers & Students',
                'description' => 'All teachers and all active students',
                'type' => Group::TYPE_MIXED,
                'audience' => Group::AUDIENCE_ALL_STUDENTS,
                'include_all_teachers' => true,
            ],
            [
                'id' => 'course',
                'name' => 'Course Group',
                'description' => 'Auto-enroll students and teacher from a course',
                'type' => Group::TYPE_COURSE,
                'audience' => Group::AUDIENCE_CUSTOM,
            ],
        ];
    }

    public function createGroup(User $creator, array $data): Group
    {
        return DB::transaction(function () use ($creator, $data) {
            $audience = $data['audience'] ?? Group::AUDIENCE_CUSTOM;

            if ($creator->hasRole(['super_admin', 'admin']) && empty($data['audience'])) {
                $audience = Group::AUDIENCE_CUSTOM;
            }

            $group = Group::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'type' => $data['type'],
                'audience' => $audience,
                'course_id' => $data['course_id'] ?? null,
                'created_by' => $creator->id,
                'allow_student_messages' => $data['allow_student_messages'] ?? true,
                'allow_student_files' => $data['allow_student_files'] ?? true,
                'allow_discussions' => $data['allow_discussions'] ?? true,
            ]);

            $this->addMember($group, $creator, GroupMember::ROLE_OWNER, true, true);

            if (! empty($data['include_all_teachers'])) {
                $this->enrollAllTeachers($group);
            }

            if ($audience !== Group::AUDIENCE_CUSTOM) {
                $this->enrollStudentsByAudience($group, $audience);
            }

            if (! empty($data['student_ids'])) {
                $studentIds = $data['student_ids'];

                if (! empty($data['course_id'])) {
                    $studentIds = $this->filterStudentIdsForCourse($studentIds, (int) $data['course_id']);
                }

                foreach ($studentIds as $studentId) {
                    $student = Student::find($studentId);
                    if ($student?->user) {
                        $this->addMember($group, $student->user);
                    }
                }
            }

            if (! empty($data['teacher_ids'])) {
                foreach ($data['teacher_ids'] as $teacherId) {
                    $teacher = Teacher::find($teacherId);
                    if ($teacher?->user) {
                        $this->addMember($group, $teacher->user, GroupMember::ROLE_MODERATOR, true, true);
                    }
                }
            }

            if (! empty($data['user_ids'])) {
                foreach ($data['user_ids'] as $userId) {
                    $user = User::find($userId);
                    if ($user && $user->id !== $creator->id) {
                        $this->addMember($group, $user);
                    }
                }
            }

            if ($group->type === Group::TYPE_COURSE && $group->course_id) {
                $this->enrollCourseStudents($group);
            }

            if ($creator->isTeacher() && ! $creator->hasRole(['super_admin', 'admin'])) {
                $group->update(['allow_discussions' => $data['allow_discussions'] ?? true]);
            }

            return $group->fresh(['creator', 'course', 'members.user']);
        });
    }

    public function refreshAudienceMembers(Group $group): int
    {
        if (! $group->audience || $group->audience === Group::AUDIENCE_CUSTOM) {
            return 0;
        }

        $count = $this->enrollStudentsByAudience($group, $group->audience);

        if ($group->type === Group::TYPE_MIXED) {
            $count += $this->enrollAllTeachers($group);
        }

        if ($group->type === Group::TYPE_COURSE && $group->course_id) {
            $this->enrollCourseStudents($group);
        }

        return $count;
    }

    public function enrollStudentsByAudience(Group $group, string $audience): int
    {
        $students = $this->studentsForAudience($audience);
        $added = 0;

        foreach ($students as $student) {
            if ($student->user) {
                $this->addMember($group, $student->user);
                $added++;
            }
        }

        return $added;
    }

    public function enrollAllTeachers(Group $group): int
    {
        $added = 0;

        Teacher::query()->with('user')->each(function (Teacher $teacher) use ($group, &$added) {
            if ($teacher->user) {
                $this->addMember($group, $teacher->user, GroupMember::ROLE_MODERATOR, true, true);
                $added++;
            }
        });

        return $added;
    }

    /**
     * @return Collection<int, Student>
     */
    public function studentsForAudience(string $audience): Collection
    {
        $query = $this->activeStudentsQuery();

        return match ($audience) {
            Group::AUDIENCE_ALL_STUDENTS => $query->get(),
            Group::AUDIENCE_FINAL_YEAR => $this->finalYearStudentsQuery($query)->get(),
            Group::AUDIENCE_SCHOLARSHIP => $query->where('is_scholarship', true)->get(),
            default => collect(),
        };
    }

    protected function activeStudentsQuery(): Builder
    {
        return Student::query()
            ->where(function ($q) {
                $q->where('enrollment_status', 'active')
                    ->orWhereNull('enrollment_status');
            })
            ->with('user');
    }

    protected function finalYearStudentsQuery(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereIn('grade_level', Group::FINAL_YEAR_LEVELS)
                ->orWhere('grade_level', 'like', '%12%')
                ->orWhere('grade_level', 'like', '%Final%');
        });
    }

    public function enrollCourseStudents(Group $group): void
    {
        $course = $group->course;
        if (! $course) {
            return;
        }

        foreach ($course->students as $student) {
            if ($student->user) {
                $this->addMember($group, $student->user);
            }
        }

        if ($course->teacher?->user) {
            $this->addMember($group, $course->teacher->user, GroupMember::ROLE_MODERATOR, true, true);
        }
    }

    public function notifyGroupMembers(Group $group, User $actor, string $title, string $body, array $meta = []): void
    {
        $members = $group->members()->with('user')->get();

        foreach ($members as $member) {
            if ($member->user_id === $actor->id || ! $member->user) {
                continue;
            }

            $this->notificationService->notifyUser(
                $member->user,
                NotificationService::CATEGORY_GROUP,
                $title,
                $body,
                array_merge(['group_id' => $group->id], $meta)
            );
        }
    }

    /**
     * @return array{can_send_messages: bool, can_upload_files: bool}
     */
    protected function defaultMemberPermissions(User $user, Group $group, string $role): array
    {
        if (in_array($role, [GroupMember::ROLE_OWNER, GroupMember::ROLE_MODERATOR], true)) {
            return ['can_send_messages' => true, 'can_upload_files' => true];
        }

        if ($user->isStudent()) {
            return [
                'can_send_messages' => (bool) $group->allow_student_messages,
                'can_upload_files' => (bool) $group->allow_student_files,
            ];
        }

        return ['can_send_messages' => true, 'can_upload_files' => true];
    }
}
