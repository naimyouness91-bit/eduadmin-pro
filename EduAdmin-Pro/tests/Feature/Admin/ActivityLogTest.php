<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_student_created_is_logged_with_admin_actor(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->postJson('/api/students', [
            'name' => 'Audit Student',
            'email' => 'audit.student@test.com',
            'password' => 'password123',
            'student_id' => 'STU-AUDIT-01',
        ])->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'action' => ActivityLogService::ACTION_STUDENT_CREATED,
        ]);
    }

    public function test_teacher_created_is_logged(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->postJson('/api/teachers', [
            'name' => 'Audit Teacher',
            'email' => 'audit.teacher@test.com',
            'password' => 'password123',
        ])->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'action' => ActivityLogService::ACTION_TEACHER_CREATED,
        ]);
    }

    public function test_grade_added_is_logged(): void
    {
        $admin = $this->createAdminUser();
        [, $teacher] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($admin);

        $this->postJson('/api/grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'title' => 'Midterm',
            'score' => 88,
        ])->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'action' => ActivityLogService::ACTION_GRADE_ADDED,
        ]);
    }

    public function test_login_and_logout_are_logged(): void
    {
        $admin = $this->createAdminUser();

        $this->postJson('/api/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'action' => ActivityLogService::ACTION_USER_LOGIN,
        ]);

        Sanctum::actingAs($admin->fresh());

        $this->postJson('/api/auth/logout')->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'action' => ActivityLogService::ACTION_USER_LOGOUT,
        ]);
    }

    public function test_admin_can_list_activity_logs_api(): void
    {
        $admin = $this->createAdminUser();
        ActivityLog::create([
            'user_id' => $admin->id,
            'action' => ActivityLogService::ACTION_STUDENT_CREATED,
            'description' => 'Test entry',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/activity-logs?action=student.created')
            ->assertOk()
            ->assertJsonPath('data.0.action', ActivityLogService::ACTION_STUDENT_CREATED);
    }

    public function test_teacher_cannot_access_activity_logs_api(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/activity-logs')->assertForbidden();
    }

    public function test_admin_web_activity_log_page_renders(): void
    {
        $admin = $this->createAdminUser();
        ActivityLog::create([
            'user_id' => $admin->id,
            'action' => ActivityLogService::ACTION_FILE_UPLOAD,
            'description' => 'Avatar uploaded',
        ]);

        Sanctum::actingAs($admin);

        $this->get(route('admin.activity-log'))
            ->assertOk()
            ->assertSee('Audit log')
            ->assertSee('File upload');
    }
}
