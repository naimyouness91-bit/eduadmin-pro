<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class CourseTeacherScopeTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_teacher_only_sees_assigned_courses(): void
    {
        [$teacherAUser, $teacherA] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();

        $courseA = $this->createCourseForTeacher($teacherA, ['name' => 'Course A', 'code' => 'A-001']);
        $this->createCourseForTeacher($teacherB, ['name' => 'Course B', 'code' => 'B-001']);

        Sanctum::actingAs($teacherAUser);

        $response = $this->getJson('/api/courses')->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame($courseA->id, $data[0]['id']);
    }

    public function test_admin_sees_all_courses(): void
    {
        [, $teacherA] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();

        $this->createCourseForTeacher($teacherA, ['code' => 'ALL-A']);
        $this->createCourseForTeacher($teacherB, ['code' => 'ALL-B']);

        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/courses')->assertOk();

        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    public function test_teacher_cannot_view_another_teachers_course(): void
    {
        [$teacherAUser] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();
        $courseB = $this->createCourseForTeacher($teacherB, ['code' => 'B-ONLY']);

        Sanctum::actingAs($teacherAUser);

        $this->getJson("/api/courses/{$courseB->id}")->assertForbidden();
    }

    public function test_teacher_cannot_override_scope_with_teacher_id_filter(): void
    {
        [$teacherAUser, $teacherA] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();

        $this->createCourseForTeacher($teacherA, ['code' => 'OWN-1']);
        $this->createCourseForTeacher($teacherB, ['code' => 'OTHER-1']);

        Sanctum::actingAs($teacherAUser);

        $response = $this->getJson('/api/courses?teacher_id='.$teacherB->id)->assertOk();

        $this->assertCount(0, $response->json('data'));
    }
}
