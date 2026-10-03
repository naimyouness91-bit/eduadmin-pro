<?php

namespace Database\Seeders;

use App\Models\Absence;
use App\Models\Course;
use App\Models\Student;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $students = Student::all();
        $courses = Course::with('teacher')->get();

        $end = now()->startOfDay();
        $start = $end->copy()->subWeeks(8);

        $weekdays = collect(CarbonPeriod::create($start, $end))
            ->filter(fn (Carbon $date) => $date->isWeekday())
            ->values();

        $statusPool = array_merge(
            array_fill(0, 4, 'present'),
            ['absent'],
            ['late']
        );

        foreach ($weekdays as $date) {
            foreach ($students as $student) {
                foreach ($courses as $course) {
                    $status = $statusPool[array_rand($statusPool)];

                    Absence::updateOrCreate(
                        [
                            'student_id' => $student->id,
                            'course_id' => $course->id,
                            'date' => $date->toDateString(),
                        ],
                        [
                            'teacher_id' => $course->teacher_id,
                            'status' => $status,
                            'method' => 'manual',
                            'notes' => null,
                        ]
                    );
                }
            }
        }
    }
}
