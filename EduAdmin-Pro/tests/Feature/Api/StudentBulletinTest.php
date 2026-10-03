<?php

namespace Tests\Feature\Api;

use App\Models\Grade;
use App\Models\StudentBulletin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class StudentBulletinTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_can_download_student_bulletin_pdf(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        $student->update(['student_id' => 'STU-BUL-001', 'grade_level' => '10', 'section' => 'A']);

        Sanctum::actingAs($admin);

        $response = $this->get("/api/students/{$student->id}/bulletin?format=pdf");

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type') ?? '');
        $this->assertStringContainsString('attachment', $response->headers->get('content-disposition') ?? '');
        $this->assertNotEmpty($response->getContent());
    }

    public function test_bulletin_html_includes_student_and_handles_missing_grades(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        $student->user->update(['name' => 'Bulletin Test Student']);
        $student->update(['student_id' => 'STU-NO-GRADES']);

        Sanctum::actingAs($admin);

        $response = $this->get("/api/students/{$student->id}/bulletin?format=html");

        $response->assertOk();
        $body = $response->getContent();
        $this->assertStringContainsString('Bulletin Test Student', $body);
        $this->assertStringContainsString('STU-NO-GRADES', $body);
        $this->assertStringContainsString('No grades recorded', $body);
        $this->assertStringContainsString('Document verification', $body);
    }

    public function test_bulletin_includes_grade_data_when_present(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Mathematics 101', 'code' => 'MATH-101']);
        $course->students()->attach($student->id);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Midterm Exam',
            'type' => 'exam',
            'score' => 85,
            'max_score' => 100,
            'weight' => 1,
        ]);

        Sanctum::actingAs($admin);

        $body = $this->get("/api/students/{$student->id}/bulletin?format=html")->assertOk()->getContent();

        $this->assertStringContainsString('Mathematics 101', $body);
        $this->assertStringContainsString('Midterm Exam', $body);
    }

    public function test_student_cannot_download_bulletin_until_published(): void
    {
        [$studentUser, $student] = $this->createStudentUser();

        Sanctum::actingAs($studentUser);

        $this->get("/api/students/{$student->id}/bulletin?format=pdf")->assertForbidden();
    }

    public function test_student_can_download_own_bulletin_when_published(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        $admin = $this->createAdminUser();

        Sanctum::actingAs($admin);
        $this->post("/api/students/{$student->id}/bulletin/generate")->assertOk();
        $this->post("/api/students/{$student->id}/bulletin/publish")->assertOk();

        Sanctum::actingAs($studentUser);

        $this->get("/api/students/{$student->id}/bulletin?format=pdf")->assertOk();
    }

    public function test_student_cannot_download_other_student_bulletin(): void
    {
        [, $student] = $this->createStudentUser();
        [$otherUser] = $this->createStudentUser();

        Sanctum::actingAs($otherUser);

        $this->get("/api/students/{$student->id}/bulletin")->assertForbidden();
    }

    public function test_teacher_cannot_access_bulletin(): void
    {
        [, $student] = $this->createStudentUser();
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($teacherUser);

        $this->get("/api/students/{$student->id}/bulletin?format=html")->assertForbidden();
        $this->get("/api/students/{$student->id}/bulletin/status")->assertForbidden();
    }

    public function test_admin_can_generate_and_publish_bulletin(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();

        Sanctum::actingAs($admin);

        $this->post("/api/students/{$student->id}/bulletin/generate")
            ->assertOk()
            ->assertJsonPath('data.status', StudentBulletin::STATUS_GENERATED);

        $this->post("/api/students/{$student->id}/bulletin/publish")
            ->assertOk()
            ->assertJsonPath('data.status', StudentBulletin::STATUS_PUBLISHED);

        $this->assertDatabaseHas('student_bulletins', [
            'student_id' => $student->id,
            'status' => StudentBulletin::STATUS_PUBLISHED,
        ]);
    }

    public function test_parent_can_view_published_child_bulletin(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        [$parentUser] = $this->createParentUser($student);

        Sanctum::actingAs($admin);
        $this->post("/api/students/{$student->id}/bulletin/publish")->assertOk();

        Sanctum::actingAs($parentUser);

        $this->get("/api/students/{$student->id}/bulletin?format=html")->assertOk();
    }

    public function test_parent_cannot_view_unpublished_child_bulletin(): void
    {
        [$parentUser, , $student] = $this->createParentUser();

        Sanctum::actingAs($parentUser);

        $this->get("/api/students/{$student->id}/bulletin?format=html")->assertForbidden();
    }

    public function test_bulletin_route_does_not_conflict_with_student_show(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        [, $student] = $this->createStudentUser();

        $this->getJson("/api/students/{$student->id}")->assertOk();
        $this->get("/api/students/{$student->id}/bulletin?format=html")->assertOk();
    }

    public function test_bulletin_status_endpoint_returns_permissions(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();

        Sanctum::actingAs($admin);

        $this->getJson("/api/students/{$student->id}/bulletin/status")
            ->assertOk()
            ->assertJsonPath('data.can_generate', true)
            ->assertJsonPath('data.can_publish', false);
    }

    public function test_admin_can_fetch_bulletin_preview_json(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Physics', 'code' => 'PHY-01']);
        $course->students()->attach($student->id);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Quiz 1',
            'type' => 'quiz',
            'score' => 18,
            'max_score' => 20,
            'weight' => 1,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/students/{$student->id}/bulletin/preview")
            ->assertOk()
            ->assertJsonPath('data.has_grades', true)
            ->assertJsonFragment(['name' => 'Physics'])
            ->assertJsonFragment(['title' => 'Quiz 1']);
    }

    public function test_bulletin_preview_without_grades_has_empty_flag(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();

        Sanctum::actingAs($admin);

        $this->getJson("/api/students/{$student->id}/bulletin/preview")
            ->assertOk()
            ->assertJsonPath('data.has_grades', false)
            ->assertJsonPath('data.grades', []);
    }
}
