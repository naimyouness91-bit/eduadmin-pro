<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Grade;
use App\Models\Student;
use Illuminate\Database\Seeder;

class GradeSeeder extends Seeder
{
    public function run(): void
    {
        $types = ['exam', 'quiz', 'homework', 'project'];
        $students = Student::all();
        $courses = Course::with('teacher')->get();

        $startDate = now()->subMonths(3)->startOfDay();
        $endDate = now()->endOfDay();

        foreach ($students as $student) {
            foreach ($courses as $course) {
                foreach ($types as $type) {
                    $title = ucfirst($type).' — '.$course->name;
                    $score = rand(55, 100);
                    $daysRange = $startDate->diffInDays($endDate);
                    $gradedAt = $startDate->copy()->addDays(rand(0, max(0, $daysRange)));

                    Grade::updateOrCreate(
                        [
                            'student_id' => $student->id,
                            'course_id' => $course->id,
                            'type' => $type,
                            'title' => $title,
                        ],
                        [
                            'teacher_id' => $course->teacher_id,
                            'score' => $score,
                            'max_score' => 100,
                            'weight' => match ($type) {
                                'exam' => 2,
                                'project' => 1.5,
                                default => 1,
                            },
                            'graded_at' => $gradedAt->toDateString(),
                            'semester' => 'Spring 2025',
                            'academic_year' => '2024-2025',
                            'feedback' => $score >= 80
                                ? 'Good work, keep it up.'
                                : 'Review the material and seek help if needed.',
                        ]
                    );
                }
            }
        }
    }
}
