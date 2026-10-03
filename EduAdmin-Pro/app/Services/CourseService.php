<?php

namespace App\Services;

use App\Models\Course;
use Illuminate\Support\Facades\DB;

class CourseService
{
    public function enrollStudents(Course $course, array $studentIds): void
    {
        DB::transaction(function () use ($course, $studentIds) {
            $pivotData = [];

            foreach ($studentIds as $studentId) {
                $pivotData[$studentId] = [
                    'status' => 'enrolled',
                    'enrolled_at' => now(),
                ];
            }

            $course->students()->syncWithoutDetaching($pivotData);
        });
    }
}
