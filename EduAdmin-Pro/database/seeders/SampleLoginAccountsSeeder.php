<?php

namespace Database\Seeders;

use App\Models\ParentModel;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleLoginAccountsSeeder extends Seeder
{
    public const PASSWORD = 'password';

    /**
     * @var array<string, array{name: string, email: string}>
     */
    public const ACCOUNTS = [
        'teacher' => [
            'name' => 'Demo Teacher',
            'email' => 'teacher@eduadmin.com',
        ],
        'student' => [
            'name' => 'Demo Student',
            'email' => 'student@eduadmin.com',
        ],
        'parent' => [
            'name' => 'Demo Parent',
            'email' => 'parent@eduadmin.com',
        ],
    ];

    /**
     * Extra localized login aliases that users commonly try from the French UI.
     *
     * @var array<int, array{name: string, email: string, student_id: string}>
     */
    public const STUDENT_ALIASES = [
        [
            'name' => 'Etudiant Demo',
            'email' => 'etudiant@eduadmin.com',
            'student_id' => 'STU-DEMO-FR-001',
        ],
    ];

    public function run(): void
    {
        $teacherUser = $this->upsertUser('teacher');
        $studentUser = $this->upsertUser('student');
        $parentUser = $this->upsertUser('parent');

        $teacher = Teacher::withTrashed()->updateOrCreate(
            ['teacher_id' => 'TCH-DEMO-001'],
            [
                'user_id' => $teacherUser->id,
                'specialization' => 'Mathematics',
                'department' => 'Demo Department',
                'qualification' => 'Demo Qualification',
                'experience_years' => 5,
                'employment_type' => 'full_time',
                'joining_date' => now()->subYear()->toDateString(),
            ]
        );
        $this->restoreIfTrashed($teacher);

        $student = Student::withTrashed()->updateOrCreate(
            ['student_id' => 'STU-DEMO-001'],
            [
                'user_id' => $studentUser->id,
                'grade_level' => 'Grade 10',
                'section' => 'A',
                'enrollment_status' => 'active',
                'enrollment_date' => now()->subMonths(3)->toDateString(),
                'guardian_name' => self::ACCOUNTS['parent']['name'],
                'guardian_email' => self::ACCOUNTS['parent']['email'],
            ]
        );
        $this->restoreIfTrashed($student);

        $parent = ParentModel::withTrashed()->updateOrCreate(
            ['user_id' => $parentUser->id],
            [
                'occupation' => 'Guardian',
                'relationship' => 'parent',
            ]
        );
        $this->restoreIfTrashed($parent);

        $parent->students()->syncWithoutDetaching([
            $student->id => ['relationship' => 'parent', 'is_primary' => true],
        ]);

        foreach (self::STUDENT_ALIASES as $alias) {
            $aliasUser = $this->upsertUser('student', $alias['name'], $alias['email']);
            $aliasStudent = $this->upsertStudentProfile($aliasUser, $alias['student_id'], [
                'guardian_name' => self::ACCOUNTS['parent']['name'],
                'guardian_email' => self::ACCOUNTS['parent']['email'],
            ]);

            $parent->students()->syncWithoutDetaching([
                $aliasStudent->id => ['relationship' => 'parent', 'is_primary' => false],
            ]);
        }
    }

    protected function upsertUser(string $role, ?string $name = null, ?string $email = null): User
    {
        $account = self::ACCOUNTS[$role] ?? [];

        $user = User::withTrashed()->updateOrCreate(
            ['email' => $email ?? $account['email']],
            [
                'name' => $name ?? $account['name'],
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
            ]
        );

        $user->forceFill([
            'role' => $role,
            'is_active' => true,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        $this->restoreIfTrashed($user);

        return $user->fresh();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    protected function upsertStudentProfile(User $user, string $studentId, array $overrides = []): Student
    {
        $student = Student::withTrashed()->updateOrCreate(
            ['student_id' => $studentId],
            array_merge([
                'user_id' => $user->id,
                'grade_level' => 'Grade 10',
                'section' => 'A',
                'enrollment_status' => 'active',
                'enrollment_date' => now()->subMonths(3)->toDateString(),
            ], $overrides)
        );

        $this->restoreIfTrashed($student);

        return $student;
    }

    protected function restoreIfTrashed($model): void
    {
        if (method_exists($model, 'trashed') && $model->trashed()) {
            $model->restore();
        }
    }
}
