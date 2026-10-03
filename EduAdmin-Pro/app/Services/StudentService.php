<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StudentService
{
    public function __construct(
        protected AuthService $authService,
        protected ParentService $parentService
    ) {}

    /**
     * @return array{student: Student, parent_credentials: array<string, mixed>|null}
     */
    public function createStudent(array $data): array
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
                'avatar' => $data['avatar_path'] ?? null,
            ]);
            $user->forceFill([
                'role' => 'student',
                'is_active' => $data['is_active'] ?? true,
            ])->save();

            $student = Student::create([
                'user_id' => $user->id,
                'student_id' => $data['student_id'] ?? $this->generateStudentId(),
                'grade_level' => $data['grade_level'] ?? null,
                'section' => $data['section'] ?? null,
                'enrollment_status' => $data['enrollment_status'] ?? 'active',
                'enrollment_date' => $data['enrollment_date'] ?? now()->toDateString(),
                'guardian_name' => $data['guardian_name']
                    ?? (! empty($data['create_parent_account']) ? ($data['parent_name'] ?? null) : null),
                'guardian_phone' => $data['guardian_phone']
                    ?? (! empty($data['create_parent_account']) ? ($data['parent_phone'] ?? null) : null),
                'guardian_email' => $data['guardian_email']
                    ?? (! empty($data['create_parent_account']) ? ($data['parent_email'] ?? null) : null),
                'blood_group' => $data['blood_group'] ?? null,
                'medical_notes' => $data['medical_notes'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            if ($actor = auth()->user()) {
                $this->authService->logActivity(
                    $actor,
                    ActivityLogService::ACTION_STUDENT_CREATED,
                    "Student created: {$user->name} ({$student->student_id}).",
                    [
                        'model_type' => Student::class,
                        'model_id' => $student->id,
                        'new_values' => [
                            'student_id' => $student->student_id,
                            'name' => $user->name,
                            'email' => $user->email,
                        ],
                    ]
                );
            }

            $parentCredentials = null;

            if (! empty($data['create_parent_account'])) {
                $tempPassword = Str::password(12, symbols: false);
                $parent = $this->parentService->createParent([
                    'name' => $data['parent_name'],
                    'email' => $data['parent_email'],
                    'password' => $tempPassword,
                    'phone' => $data['parent_phone'] ?? null,
                    'relationship' => $data['parent_relationship'] ?? 'guardian',
                    'student_ids' => [$student->id],
                ]);

                $parentCredentials = [
                    'parent_id' => $parent->id,
                    'name' => $data['parent_name'],
                    'email' => $data['parent_email'],
                    'temporary_password' => $tempPassword,
                ];
            }

            return [
                'student' => $student->load(['user', 'parents.user']),
                'parent_credentials' => $parentCredentials,
            ];
        });
    }

    public function updateStudent(Student $student, array $data): Student
    {
        return DB::transaction(function () use ($student, $data) {
            $oldStudent = $student->replicate()->toArray();
            $oldUser = $student->user->replicate()->toArray();

            $userFields = [
                'name', 'email', 'password', 'phone', 'address', 'date_of_birth',
                'gender', 'locale', 'timezone', 'theme', 'is_active',
            ];

            if ($userPayload = Arr::only($data, $userFields)) {
                if (isset($userPayload['password']) && empty($userPayload['password'])) {
                    unset($userPayload['password']);
                }
                $student->user->updateProfileAttributes($userPayload);
            }

            if (! empty($data['avatar_path'])) {
                if ($student->user->avatar) {
                    Storage::disk('public')->delete($student->user->avatar);
                }
                $student->user->update(['avatar' => $data['avatar_path']]);
            }

            $studentFields = [
                'student_id', 'grade_level', 'section', 'enrollment_status',
                'enrollment_date', 'guardian_name', 'guardian_phone', 'guardian_email',
                'blood_group', 'medical_notes', 'notes',
            ];

            if ($studentPayload = Arr::only($data, $studentFields)) {
                $student->update($studentPayload);
            }

            $student->refresh()->load('user');

            if ($actor = auth()->user()) {
                $this->authService->logActivity(
                    $actor,
                    ActivityLogService::ACTION_STUDENT_UPDATED,
                    "Student updated: {$student->user->name} ({$student->student_id}).",
                    [
                        'model_type' => Student::class,
                        'model_id' => $student->id,
                        'old_values' => ['student' => $oldStudent, 'user' => $oldUser],
                        'new_values' => [
                            'student_id' => $student->student_id,
                            'name' => $student->user->name,
                            'grade_level' => $student->grade_level,
                        ],
                    ]
                );
            }

            return $student;
        });
    }

    public function generateStudentId(): string
    {
        $year = now()->format('Y');
        $prefix = "STU{$year}";

        $last = Student::withTrashed()
            ->where('student_id', 'like', "{$prefix}%")
            ->orderByDesc('student_id')
            ->value('student_id');

        $sequence = $last ? ((int) substr($last, -4)) + 1 : 1;

        do {
            $candidate = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
            $sequence++;
        } while (Student::where('student_id', $candidate)->whereNull('deleted_at')->exists());

        return $candidate;
    }
}
