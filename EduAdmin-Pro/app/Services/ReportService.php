<?php

namespace App\Services;

use App\Models\Student;

class ReportService
{
    public function __construct(
        protected GradeService $gradeService,
        protected AttendanceService $attendanceService
    ) {}

    public function generateStudentReport(Student $student): array
    {
        $student->load([
            'user',
            'courses.teacher.user',
            'grades.course',
            'absences.course',
            'parents.user',
            'submissions.assignment.course',
            'payments',
        ]);

        $gradesByCourse = $student->grades
            ->groupBy('course_id')
            ->map(function ($grades, $courseId) {
                $course = $grades->first()->course;
                $percentages = $grades
                    ->filter(fn ($g) => $g->percentage !== null)
                    ->pluck('percentage');

                return [
                    'course_id' => (int) $courseId,
                    'course' => $course,
                    'grades' => $grades->values()->all(),
                    'average' => $percentages->isNotEmpty()
                        ? round($percentages->avg(), 2)
                        : null,
                ];
            })
            ->values()
            ->all();

        $attendanceByCourse = $student->courses->map(function ($course) use ($student) {
            $records = $student->absences->where('course_id', $course->id);
            $total = $records->count();
            $present = $records->where('status', 'present')->count();
            $absent = $records->where('status', 'absent')->count();
            $late = $records->where('status', 'late')->count();
            $excused = $records->where('status', 'excused')->count();

            return [
                'course' => $course,
                'total' => $total,
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'excused' => $excused,
                'rate' => $total > 0
                    ? round((($present + $excused) / $total) * 100, 2)
                    : 100.0,
            ];
        })->values()->all();

        $overallAttendance = collect($attendanceByCourse);
        $globalAttendanceRate = $overallAttendance->sum('total') > 0
            ? round(
                ($overallAttendance->sum('present') + $overallAttendance->sum('excused'))
                / $overallAttendance->sum('total') * 100,
                2
            )
            : 100.0;

        return [
            'generated_at' => now()->toIso8601String(),
            'student' => [
                'id' => $student->id,
                'student_id' => $student->student_id,
                'grade_level' => $student->grade_level,
                'section' => $student->section,
                'enrollment_status' => $student->enrollment_status,
                'enrollment_date' => $student->enrollment_date?->toDateString(),
                'guardian_name' => $student->guardian_name,
                'guardian_phone' => $student->guardian_phone,
                'guardian_email' => $student->guardian_email,
                'blood_group' => $student->blood_group,
                'medical_notes' => $student->medical_notes,
                'notes' => $student->notes,
            ],
            'user' => $student->user,
            'summary' => [
                'average_grade' => $student->average_grade,
                'attendance_rate' => $student->attendance_rate,
                'global_attendance_rate' => $globalAttendanceRate,
                'courses_enrolled' => $student->courses->count(),
                'total_grades' => $student->grades->count(),
                'total_payments' => $student->payments->count(),
                'payments_total' => round((float) $student->payments->sum('amount'), 2),
            ],
            'courses' => $student->courses->map(fn ($course) => [
                'course' => $course,
                'pivot' => $course->pivot,
                'teacher' => $course->teacher,
            ])->values()->all(),
            'grades_by_course' => $gradesByCourse,
            'attendance_by_course' => $attendanceByCourse,
            'parents' => $student->parents->map(fn ($parent) => [
                'parent' => $parent,
                'pivot' => $parent->pivot,
                'user' => $parent->user,
            ])->values()->all(),
            'recent_submissions' => $student->submissions
                ->sortByDesc('submitted_at')
                ->take(10)
                ->values()
                ->all(),
            'payments' => $student->payments
                ->sortByDesc('paid_at')
                ->values()
                ->all(),
        ];
    }
}
