<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $teachers = [
            'sarah@eduadmin.com' => Teacher::whereHas('user', fn ($q) => $q->where('email', 'sarah@eduadmin.com'))->first(),
            'james@eduadmin.com' => Teacher::whereHas('user', fn ($q) => $q->where('email', 'james@eduadmin.com'))->first(),
            'emily@eduadmin.com' => Teacher::whereHas('user', fn ($q) => $q->where('email', 'emily@eduadmin.com'))->first(),
        ];

        $courses = [
            [
                'name' => 'Advanced Mathematics',
                'code' => 'MATH-401',
                'description' => 'Calculus, algebra, and advanced problem solving.',
                'teacher' => $teachers['sarah@eduadmin.com'],
                'grade_level' => 'Grade 10',
                'room' => 'Room 101',
            ],
            [
                'name' => 'Physics I',
                'code' => 'PHYS-101',
                'description' => 'Mechanics, thermodynamics, and waves.',
                'teacher' => $teachers['james@eduadmin.com'],
                'grade_level' => 'Grade 10',
                'room' => 'Lab 201',
            ],
            [
                'name' => 'English Literature',
                'code' => 'ENG-201',
                'description' => 'Classic and modern literature analysis.',
                'teacher' => $teachers['emily@eduadmin.com'],
                'grade_level' => 'Grade 10',
                'room' => 'Room 305',
            ],
            [
                'name' => 'Computer Science',
                'code' => 'CS-101',
                'description' => 'Programming fundamentals and algorithms.',
                'teacher' => $teachers['emily@eduadmin.com'],
                'grade_level' => 'Grade 10',
                'room' => 'Lab 102',
            ],
            [
                'name' => 'Biology',
                'code' => 'BIO-101',
                'description' => 'Cell biology, genetics, and ecology.',
                'teacher' => $teachers['james@eduadmin.com'],
                'grade_level' => 'Grade 10',
                'room' => 'Lab 301',
            ],
        ];

        $studentIds = Student::pluck('id');
        $enrolledAt = now();

        foreach ($courses as $data) {
            if (! $data['teacher']) {
                continue;
            }

            $course = Course::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'teacher_id' => $data['teacher']->id,
                    'grade_level' => $data['grade_level'],
                    'credits' => 3,
                    'status' => 'active',
                    'semester' => 'Spring 2025',
                    'academic_year' => '2024-2025',
                    'room' => $data['room'],
                    'max_students' => 30,
                ]
            );

            $sync = $studentIds->mapWithKeys(fn ($id) => [
                $id => ['status' => 'enrolled', 'enrolled_at' => $enrolledAt],
            ])->all();

            $course->students()->sync($sync);

            foreach ([1, 3, 5] as $day) {
                foreach ([['08:00:00', '09:00:00'], ['12:00:00', '13:00:00']] as [$start, $end]) {
                    Schedule::updateOrCreate(
                        [
                            'course_id' => $course->id,
                            'day_of_week' => $day,
                            'start_time' => $start,
                        ],
                        [
                            'teacher_id' => $data['teacher']->id,
                            'end_time' => $end,
                            'room' => $data['room'],
                            'semester' => 'Spring 2025',
                            'academic_year' => '2024-2025',
                            'is_active' => true,
                        ]
                    );
                }
            }
        }
    }
}
