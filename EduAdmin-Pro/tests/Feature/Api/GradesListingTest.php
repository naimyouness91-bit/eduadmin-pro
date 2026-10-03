<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Grade;
use App\Models\Student;
use App\Services\GradeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class GradesListingTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_sees_grades_and_stats(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'type' => 'exam',
            'title' => 'Midterm Exam',
            'score' => 85,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/grades')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.title', 'Midterm Exam');

        $this->getJson('/api/grades-stats')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('exams', 1)
            ->assertJsonPath('average', 85);
    }

    public function test_teacher_sees_grades_for_assigned_courses(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'type' => 'quiz',
            'title' => 'Quiz 1',
            'score' => 72,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/grades')
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->getJson('/api/grades-stats')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('quizzes', 1);
    }

    public function test_admin_auto_seeds_demo_grades_when_table_empty(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id, ['status' => 'active', 'enrolled_at' => now()]);

        $this->assertSame(0, Grade::count());

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/grades')->assertOk();
        $this->assertGreaterThan(0, $response->json('total'));
        $this->assertGreaterThan(0, Grade::count());
    }

    public function test_grade_filters_by_course_and_type(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $courseA = $this->createCourseForTeacher($teacher, ['code' => 'FILT-A']);
        $courseB = $this->createCourseForTeacher($teacher, ['code' => 'FILT-B']);
        $courseA->students()->attach($student->id);
        $courseB->students()->attach($student->id);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $courseA->id,
            'teacher_id' => $teacher->id,
            'type' => 'exam',
            'title' => 'Course A Exam',
            'score' => 80,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $courseB->id,
            'teacher_id' => $teacher->id,
            'type' => 'project',
            'title' => 'Course B Project',
            'score' => 90,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/grades?course_id={$courseA->id}&type=exam")
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.title', 'Course A Exam');
    }

    public function test_seed_demo_grades_service_skips_when_records_exist(): void
    {
        [, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'type' => 'exam',
            'title' => 'Existing',
            'score' => 50,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        $created = app(GradeService::class)->seedDemoGradesIfEmpty();

        $this->assertSame(0, $created);
        $this->assertSame(1, Grade::count());
    }
}
