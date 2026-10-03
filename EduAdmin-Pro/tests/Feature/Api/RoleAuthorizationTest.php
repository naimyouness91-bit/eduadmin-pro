<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class RoleAuthorizationTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_student_cannot_create_courses(): void
    {
        [$user] = $this->createStudentUser();
        Sanctum::actingAs($user);

        $this->postJson('/api/courses', [
            'name' => 'Hacked Course',
            'code' => 'HACK-001',
        ])->assertForbidden();
    }

    public function test_student_cannot_access_admin_student_routes(): void
    {
        [$user] = $this->createStudentUser();
        Sanctum::actingAs($user);

        $this->getJson('/api/students')->assertForbidden();
        $this->postJson('/api/students', [])->assertForbidden();
    }

    public function test_student_cannot_access_admin_teacher_routes(): void
    {
        [$user] = $this->createStudentUser();
        Sanctum::actingAs($user);

        $this->getJson('/api/teachers')->assertForbidden();
    }

    public function test_student_cannot_create_grades(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($studentUser);

        $this->postJson('/api/grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'title' => 'Exam',
            'score' => 99,
        ])->assertForbidden();
    }

    public function test_student_cannot_mark_attendance(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($studentUser);

        $this->postJson('/api/attendance/mark', [
            'course_id' => $course->id,
            'student_id' => $student->id,
            'date' => now()->toDateString(),
            'status' => 'present',
        ])->assertForbidden();
    }

    public function test_student_can_list_enrolled_courses(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Math 101', 'code' => 'MATH-101']);
        $course->students()->attach($student->id);

        Sanctum::actingAs($studentUser);

        $response = $this->getJson('/api/courses')->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($course->id, $ids);
    }

    public function test_student_cannot_access_analytics(): void
    {
        [$user] = $this->createStudentUser();
        Sanctum::actingAs($user);

        $this->getJson('/api/analytics/overview')->assertForbidden();
    }

    public function test_teacher_can_list_students_but_cannot_manage_them(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/students')->assertOk();
        $this->postJson('/api/students', [])->assertForbidden();
        $this->getJson('/api/students-stats')->assertForbidden();
        $this->getJson('/api/teachers')->assertForbidden();
    }

    public function test_teacher_cannot_create_courses(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/courses', [
            'name' => 'Teacher Course',
            'code' => 'TCH-CRS-1',
        ])->assertForbidden();
    }

    public function test_teacher_cannot_access_analytics_or_settings(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/analytics/overview')->assertForbidden();
        $this->getJson('/api/settings')->assertForbidden();
    }

    public function test_teacher_can_create_grades_for_their_course(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'title' => 'Quiz 1',
            'score' => 85,
        ])->assertCreated();
    }

    public function test_teacher_can_mark_attendance(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/attendance/mark', [
            'course_id' => $course->id,
            'student_id' => $student->id,
            'date' => now()->toDateString(),
            'status' => 'present',
        ])->assertCreated();
    }

    public function test_admin_can_access_admin_modules(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->getJson('/api/students')->assertOk();
        $this->getJson('/api/teachers')->assertOk();
        $this->getJson('/api/analytics/overview')->assertOk();
        $this->getJson('/api/settings')->assertOk();
    }

    public function test_admin_can_create_courses(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->postJson('/api/courses', [
            'name' => 'Admin Course',
            'code' => 'ADM-'.uniqid(),
        ])->assertCreated();
    }

    public function test_student_cannot_view_unenrolled_course(): void
    {
        [$studentUser] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($studentUser);

        $this->getJson("/api/courses/{$course->id}")->assertForbidden();
    }

    public function test_register_route_is_not_available_on_api(): void
    {
        $this->postJson('/api/auth/register', [
            'email' => 'new@test.com',
            'password' => 'password',
        ])->assertNotFound();
    }
}
