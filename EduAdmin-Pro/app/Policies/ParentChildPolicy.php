<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class ParentChildPolicy
{
    /**
     * Parent may view a student only when linked via parent_student pivot.
     */
    public function view(User $user, Student $student): bool
    {
        if (! $user->isParent()) {
            return false;
        }

        $parent = $user->parent;

        if (! $parent) {
            return false;
        }

        return $parent->students()->where('students.id', $student->id)->exists();
    }
}
