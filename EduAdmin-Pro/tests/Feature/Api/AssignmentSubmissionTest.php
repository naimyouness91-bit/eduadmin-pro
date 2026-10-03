<?php

namespace Tests\Feature\Api;

use App\Models\Assignment;
use App\Models\Submission;
use App\Services\SubmissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class AssignmentSubmissionTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_teacher_can_create_assignment_with_attachment(): void
    {
        Storage::fake('public');
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $file = UploadedFile::fake()->create('brief.pdf', 100, 'application/pdf');

        $response = $this->post('/api/assignments', [
            'course_id' => $course->id,
            'title' => 'Essay 1',
            'description' => 'Write about Laravel.',
            'due_date' => now()->addDays(3)->toIso8601String(),
            'attachment' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertCreated();
        $assignment = Assignment::first();
        $this->assertNotNull($assignment);
        $this->assertSame('Essay 1', $assignment->title);
        $this->assertNotNull($assignment->attachment_path);
        Storage::disk('public')->assertExists($assignment->attachment_path);
    }

    public function test_student_sees_only_enrolled_course_assignments(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();

        $enrolledCourse = $this->createCourseForTeacher($teacher, ['code' => 'ENROLLED']);
        $otherCourse = $this->createCourseForTeacher($teacher, ['code' => 'OTHER']);

        $student->courses()->attach($enrolledCourse->id, [
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        Assignment::create([
            'course_id' => $enrolledCourse->id,
            'teacher_id' => $teacher->id,
            'title' => 'Visible',
            'status' => 'published',
            'due_date' => now()->addWeek(),
        ]);

        Assignment::create([
            'course_id' => $otherCourse->id,
            'teacher_id' => $teacher->id,
            'title' => 'Hidden',
            'status' => 'published',
            'due_date' => now()->addWeek(),
        ]);

        Sanctum::actingAs($studentUser);

        $response = $this->getJson('/api/assignments')->assertOk();
        $titles = collect($response->json('data'))->pluck('title')->all();

        $this->assertContains('Visible', $titles);
        $this->assertNotContains('Hidden', $titles);
    }

    public function test_student_submission_marks_late_after_deadline(): void
    {
        Storage::fake('public');
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);

        $student->courses()->attach($course->id, [
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $assignment = Assignment::create([
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Late task',
            'status' => 'published',
            'due_date' => now()->subHour(),
        ]);

        Sanctum::actingAs($studentUser);

        $file = UploadedFile::fake()->create('work.pdf', 50, 'application/pdf');

        $this->post("/api/assignments/{$assignment->id}/submissions", [
            'file' => $file,
        ], ['Accept' => 'application/json'])->assertCreated();

        $submission = Submission::where('assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->first();

        $this->assertSame(SubmissionService::STATUS_LATE, $submission->status);
    }

    public function test_teacher_can_review_submission(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);

        $assignment = Assignment::create([
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Review me',
            'status' => 'published',
        ]);

        $submission = Submission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => SubmissionService::STATUS_SUBMITTED,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($teacherUser);

        $this->putJson("/api/submissions/{$submission->id}/review", [
            'score' => 88,
            'feedback' => 'Well done',
        ])->assertOk();

        $submission->refresh();
        $this->assertSame(SubmissionService::STATUS_REVIEWED, $submission->status);
        $this->assertSame('88.00', $submission->score);
    }

    public function test_admin_sees_all_assignments(): void
    {
        [, $teacher] = $this->createTeacherUser();
        $this->createCourseForTeacher($teacher, ['code' => 'A1']);
        $this->createCourseForTeacher($teacher, ['code' => 'A2']);

        Assignment::create([
            'course_id' => $teacher->courses()->first()->id,
            'teacher_id' => $teacher->id,
            'title' => 'One',
            'status' => 'published',
        ]);

        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->getJson('/api/assignments')
            ->assertOk()
            ->assertJsonPath('total', 1);
    }
}
