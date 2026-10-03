<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Course;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

trait AuthorizesParentChildAccess
{
    /**
     * @return Collection<int, int>
     */
    protected function parentLinkedStudentIds(User $user): Collection
    {
        if (! $user->isParent()) {
            return collect();
        }

        $parent = $user->parent;
        if (! $parent) {
            return collect();
        }

        return $parent->students()->pluck('students.id');
    }

    protected function parentIsLinkedToStudent(User $user, Student|int $student): bool
    {
        $studentId = $student instanceof Student ? $student->id : (int) $student;

        return $this->parentLinkedStudentIds($user)->contains($studentId);
    }

    protected function denyUnlessParentLinkedToStudent(User $user, Student|int $student): ?JsonResponse
    {
        if (! $user->isParent()) {
            return null;
        }

        if (! $this->parentIsLinkedToStudent($user, $student)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return null;
    }

    protected function denyUnlessParentOwnsCourse(User $user, int $courseId): ?JsonResponse
    {
        if (! $user->isParent()) {
            return null;
        }

        $childIds = $this->parentLinkedStudentIds($user);
        if ($childIds->isEmpty()) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $allowed = Course::query()
            ->where('id', $courseId)
            ->whereHas('students', fn ($q) => $q->whereIn('students.id', $childIds))
            ->exists();

        if (! $allowed) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return null;
    }

    protected function parentChildCourseIds(User $user): Collection
    {
        $childIds = $this->parentLinkedStudentIds($user);
        if ($childIds->isEmpty()) {
            return collect();
        }

        return Course::query()
            ->whereHas('students', fn ($q) => $q->whereIn('students.id', $childIds))
            ->pluck('id');
    }

    protected function denyParentFromGlobalList(User $user, string $portalHint): ?JsonResponse
    {
        if ($user->isParent()) {
            return response()->json([
                'message' => 'Access denied. '.$portalHint,
            ], 403);
        }

        return null;
    }
}
