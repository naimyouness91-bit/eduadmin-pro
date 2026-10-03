<?php

namespace App\Services;

use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class TeacherService
{
    public function __construct(
        protected AuthService $authService
    ) {}

    public function createTeacher(array $data): Teacher
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'locale' => $data['locale'] ?? 'en',
                'timezone' => $data['timezone'] ?? 'UTC',
                'theme' => $data['theme'] ?? 'light',
            ]);
            $user->forceFill([
                'role' => 'teacher',
                'is_active' => $data['is_active'] ?? true,
            ])->save();

            $teacher = Teacher::create([
                'user_id' => $user->id,
                'teacher_id' => $data['teacher_id'] ?? $this->generateTeacherId(),
                'specialization' => $data['specialization'] ?? null,
                'department' => $data['department'] ?? null,
                'qualification' => $data['qualification'] ?? null,
                'experience_years' => $data['experience_years'] ?? null,
                'employment_type' => $data['employment_type'] ?? null,
                'joining_date' => $data['joining_date'] ?? now()->toDateString(),
                'salary' => $data['salary'] ?? null,
                'bio' => $data['bio'] ?? null,
            ]);

            if ($actor = auth()->user()) {
                $this->authService->logActivity(
                    $actor,
                    ActivityLogService::ACTION_TEACHER_CREATED,
                    "Teacher created: {$user->name} ({$teacher->teacher_id}).",
                    [
                        'model_type' => Teacher::class,
                        'model_id' => $teacher->id,
                        'new_values' => [
                            'teacher_id' => $teacher->teacher_id,
                            'name' => $user->name,
                            'department' => $teacher->department,
                        ],
                    ]
                );
            }

            return $teacher->load('user');
        });
    }

    public function updateTeacher(Teacher $teacher, array $data): Teacher
    {
        return DB::transaction(function () use ($teacher, $data) {
            $oldTeacher = $teacher->replicate()->toArray();
            $oldUser = $teacher->user->replicate()->toArray();

            $userFields = [
                'name', 'email', 'password', 'phone', 'address', 'date_of_birth',
                'gender', 'locale', 'timezone', 'theme', 'is_active',
            ];

            if ($userPayload = Arr::only($data, $userFields)) {
                $teacher->user->updateProfileAttributes($userPayload);
            }

            $teacherFields = [
                'teacher_id', 'specialization', 'department', 'qualification',
                'experience_years', 'employment_type', 'joining_date', 'salary', 'bio',
            ];

            if ($teacherPayload = Arr::only($data, $teacherFields)) {
                $teacher->update($teacherPayload);
            }

            $teacher->refresh()->load('user');

            if ($actor = auth()->user()) {
                $this->authService->logActivity(
                    $actor,
                    ActivityLogService::ACTION_TEACHER_UPDATED,
                    "Teacher updated: {$teacher->user->name} ({$teacher->teacher_id}).",
                    [
                        'model_type' => Teacher::class,
                        'model_id' => $teacher->id,
                        'old_values' => ['teacher' => $oldTeacher, 'user' => $oldUser],
                        'new_values' => [
                            'teacher_id' => $teacher->teacher_id,
                            'name' => $teacher->user->name,
                            'department' => $teacher->department,
                        ],
                    ]
                );
            }

            return $teacher;
        });
    }

    public function generateTeacherId(): string
    {
        $year = now()->format('Y');
        $prefix = "TCH{$year}";

        $last = Teacher::withTrashed()
            ->where('teacher_id', 'like', "{$prefix}%")
            ->orderByDesc('teacher_id')
            ->value('teacher_id');

        $sequence = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
