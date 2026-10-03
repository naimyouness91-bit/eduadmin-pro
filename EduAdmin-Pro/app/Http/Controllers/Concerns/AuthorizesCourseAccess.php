<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Course;
use App\Models\Grade;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;

trait AuthorizesCourseAccess
{
    protected function userCanManageCourse(?User $user, Course $course): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ($user->isTeacher() && $user->teacher) {
            return (int) $course->teacher_id === (int) $user->teacher->id;
        }

        return false;
    }

    protected function denyUnlessCanManageCourse(?User $user, Course $course): ?JsonResponse
    {
        if (! $this->userCanManageCourse($user, $course)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return null;
    }

    protected function userCanViewStudent(?User $user, Student $student): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ($user->isStudent()) {
            return (int) $user->student?->id === (int) $student->id;
        }

        if ($user->isParent()) {
            $parent = $user->parent()->first();

            return $parent && $parent->students()->where('students.id', $student->id)->exists();
        }

        if ($user->isTeacher() && $user->teacher) {
            return $student->courses()->where('teacher_id', $user->teacher->id)->exists();
        }

        return false;
    }

    protected function denyUnlessCanViewStudent(?User $user, Student $student): ?JsonResponse
    {
        if (! $this->userCanViewStudent($user, $student)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return null;
    }

    protected function denyUnlessCanManageGrade(?User $user, Grade $grade): ?JsonResponse
    {
        $grade->loadMissing('course');

        if (! $grade->course) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return $this->denyUnlessCanManageCourse($user, $grade->course);
    }
}
