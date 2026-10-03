<?php

namespace Tests\Concerns;

use App\Models\Course;
use App\Models\ParentModel;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Str;

trait CreatesTestUsers
{
    protected function createAdminUser(): User
    {
        return User::factory()->admin()->create();
    }

    /**
     * @return array{0: User, 1: Teacher}
     */
    protected function createTeacherUser(): array
    {
        $user = User::factory()->teacher()->create();

        $teacher = Teacher::create([
            'user_id' => $user->id,
            'teacher_id' => 'TCH-'.Str::upper(Str::random(6)),
        ]);

        return [$user, $teacher];
    }

    /**
     * @return array{0: User, 1: Student}
     */
    protected function createStudentUser(): array
    {
        $user = User::factory()->student()->create();

        $student = Student::create([
            'user_id' => $user->id,
            'student_id' => 'STU-'.Str::upper(Str::random(6)),
            'grade_level' => '10',
            'enrollment_status' => 'active',
        ]);

        return [$user, $student];
    }

    /**
     * @return array{0: User, 1: ParentModel, 2: Student}
     */
    protected function createParentUser(?Student $linkToStudent = null): array
    {
        $user = User::factory()->parent()->create();

        $parent = ParentModel::create([
            'user_id' => $user->id,
            'relationship' => 'guardian',
        ]);

        if ($linkToStudent === null) {
            [, $linkToStudent] = $this->createStudentUser();
        }

        $parent->students()->syncWithoutDetaching([
            $linkToStudent->id => ['relationship' => 'parent', 'is_primary' => true],
        ]);

        return [$user, $parent, $linkToStudent];
    }

    protected function createCourseForTeacher(Teacher $teacher, array $overrides = []): Course
    {
        return Course::create(array_merge([
            'name' => 'Test Course',
            'code' => 'CRS-'.Str::upper(Str::random(6)),
            'teacher_id' => $teacher->id,
            'status' => 'active',
        ], $overrides));
    }
}
