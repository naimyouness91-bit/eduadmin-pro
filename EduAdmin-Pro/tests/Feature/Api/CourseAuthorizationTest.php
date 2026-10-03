<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class CourseAuthorizationTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_teacher_cannot_grade_students_in_other_teachers_course(): void
    {
        [$teacherUserA] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $courseB = $this->createCourseForTeacher($teacherB);
        $courseB->students()->attach($student->id);

        Sanctum::actingAs($teacherUserA);

        $this->postJson('/api/grades', [
            'student_id' => $student->id,
            'course_id' => $courseB->id,
            'title' => 'Midterm',
            'score' => 85,
        ])->assertForbidden();
    }

    public function test_teacher_cannot_mark_attendance_for_other_teachers_course(): void
    {
        [$teacherUserA] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $courseB = $this->createCourseForTeacher($teacherB);
        $courseB->students()->attach($student->id);

        Sanctum::actingAs($teacherUserA);

        $this->postJson('/api/attendance/mark', [
            'course_id' => $courseB->id,
            'student_id' => $student->id,
            'date' => now()->toDateString(),
            'status' => 'present',
        ])->assertForbidden();
    }

    public function test_non_student_cannot_scan_qr_for_another_student(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        [, $teacher] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/attendance/qr/scan', [
            'token' => str_repeat('a', 32),
            'student_id' => $student->id,
        ])->assertForbidden();
    }

    public function test_parent_only_sees_courses_for_linked_children(): void
    {
        [$parentUser, , $linkedStudent] = $this->createParentUser();
        [, $otherStudent] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();

        $linkedCourse = $this->createCourseForTeacher($teacher, ['name' => 'Linked Course']);
        $otherCourse = $this->createCourseForTeacher($teacher, ['name' => 'Other Course']);
        $linkedCourse->students()->attach($linkedStudent->id);
        $otherCourse->students()->attach($otherStudent->id);

        Sanctum::actingAs($parentUser);

        $response = $this->getJson('/api/courses')->assertOk();
        $names = collect($response->json('data'))->pluck('name');

        $this->assertTrue($names->contains('Linked Course'));
        $this->assertFalse($names->contains('Other Course'));
    }
}
