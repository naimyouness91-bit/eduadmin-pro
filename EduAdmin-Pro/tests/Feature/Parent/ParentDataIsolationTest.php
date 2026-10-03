<?php

namespace Tests\Feature\Parent;

use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ParentDataIsolationTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_parent_cannot_use_global_grades_endpoint(): void
    {
        [$parentUser] = $this->createParentUser();

        Sanctum::actingAs($parentUser);

        $this->getJson('/api/grades')->assertForbidden();
        $this->getJson('/api/grades-stats')->assertForbidden();
    }

    public function test_parent_sees_only_linked_child_grades_via_portal(): void
    {
        [$parentUser, , $linkedStudent] = $this->createParentUser();
        [, $otherStudent] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();

        $linkedCourse = $this->createCourseForTeacher($teacher, ['code' => 'LINK-A']);
        $otherCourse = $this->createCourseForTeacher($teacher, ['code' => 'OTHR-B']);

        $linkedCourse->students()->attach($linkedStudent->id, ['status' => 'active', 'enrolled_at' => now()]);
        $otherCourse->students()->attach($otherStudent->id, ['status' => 'active', 'enrolled_at' => now()]);

        Grade::create([
            'student_id' => $linkedStudent->id,
            'course_id' => $linkedCourse->id,
            'teacher_id' => $teacher->id,
            'type' => 'exam',
            'title' => 'Linked child exam',
            'score' => 85,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        Grade::create([
            'student_id' => $otherStudent->id,
            'course_id' => $otherCourse->id,
            'teacher_id' => $teacher->id,
            'type' => 'exam',
            'title' => 'Other child exam',
            'score' => 40,
            'max_score' => 100,
            'graded_at' => now()->toDateString(),
        ]);

        Sanctum::actingAs($parentUser);

        $response = $this->getJson("/api/parent/children/{$linkedStudent->id}/grades")->assertOk();
        $titles = collect($response->json('data'))->pluck('title');

        $this->assertTrue($titles->contains('Linked child exam'));
        $this->assertFalse($titles->contains('Other child exam'));

        $this->getJson("/api/parent/children/{$otherStudent->id}/grades")->assertForbidden();
    }

    public function test_parent_cannot_use_global_attendance_endpoint(): void
    {
        [$parentUser] = $this->createParentUser();

        Sanctum::actingAs($parentUser);

        $this->getJson('/api/attendance')->assertForbidden();
    }

    public function test_parent_cannot_view_foreign_timetable(): void
    {
        [$parentUser, , $linkedStudent] = $this->createParentUser();

        $linkedSection = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'label' => 'Grade 10 A',
            'is_active' => true,
        ]);

        $foreignSection = ClassSection::create([
            'grade_level' => 'Grade 11',
            'section' => 'B',
            'label' => 'Grade 11 B',
            'is_active' => true,
        ]);

        $linkedStudent->update(['grade_level' => 'Grade 10', 'section' => 'A']);

        $linkedTimetable = Timetable::create([
            'class_section_id' => $linkedSection->id,
            'name' => '10 A',
            'is_published' => true,
        ]);

        $foreignTimetable = Timetable::create([
            'class_section_id' => $foreignSection->id,
            'name' => '11 B',
            'is_published' => true,
        ]);

        Sanctum::actingAs($parentUser);

        $this->getJson("/api/timetables/{$linkedTimetable->id}")->assertOk();
        $this->getJson("/api/timetables/{$foreignTimetable->id}")->assertForbidden();
    }

    public function test_parent_cannot_use_global_assignments_endpoint(): void
    {
        [$parentUser] = $this->createParentUser();

        Sanctum::actingAs($parentUser);

        $this->getJson('/api/assignments')->assertForbidden();
    }
}
