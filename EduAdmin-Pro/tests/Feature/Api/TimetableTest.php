<?php

namespace Tests\Feature\Api;

use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class TimetableTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_can_create_timetable_and_assign_slot(): void
    {
        $admin = $this->createAdminUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, [
            'name' => 'Math 10A',
            'code' => 'M10A',
            'grade_level' => 'Grade 10',
        ]);

        $section = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'label' => 'Grade 10 A',
            'academic_year' => '2024-2025',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $timetableId = $this->postJson('/api/timetables', [
            'class_section_id' => $section->id,
            'name' => 'Test Timetable',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/timetables/{$timetableId}/entries", [
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '10:00',
            'course_id' => $course->id,
            'room' => 'Salle 12',
        ])->assertOk()
            ->assertJsonFragment(['name' => 'Math 10A']);

        $this->postJson("/api/timetables/{$timetableId}/publish")
            ->assertOk()
            ->assertJsonPath('data.timetable.is_published', true);
    }

    public function test_student_sees_published_class_timetable(): void
    {
        $admin = $this->createAdminUser();
        [$studentUser, $student] = $this->createStudentUser();
        $student->update(['grade_level' => 'Grade 10', 'section' => 'B']);

        $section = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'B',
            'label' => 'Grade 10 B',
            'is_active' => true,
        ]);

        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['grade_level' => 'Grade 10']);

        $timetable = Timetable::create([
            'class_section_id' => $section->id,
            'name' => '10 B',
            'is_published' => true,
        ]);

        TimetableEntry::create([
            'timetable_id' => $timetable->id,
            'day_of_week' => 2,
            'start_time' => '10:00',
            'end_time' => '12:00',
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'room' => 'Lab 1',
        ]);

        Sanctum::actingAs($studentUser);

        $this->getJson('/api/timetables/mine')
            ->assertOk()
            ->assertJsonPath('data.class_section.label', 'Grade 10 B')
            ->assertJsonStructure(['data' => ['cells', 'days', 'sessions_by_day']]);
    }

    public function test_class_sections_sync_from_students(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        $student->update(['grade_level' => 'Grade 11', 'section' => 'C']);

        Sanctum::actingAs($admin);

        $this->assertDatabaseCount('class_sections', 0);

        $response = $this->getJson('/api/class-sections')
            ->assertOk();

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertDatabaseHas('class_sections', [
            'grade_level' => 'Grade 11',
            'section' => 'C',
        ]);
    }

    public function test_admin_can_auto_generate_timetable_for_class(): void
    {
        $admin = $this->createAdminUser();

        $section = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'label' => 'Grade 10 A',
            'is_active' => true,
        ]);

        [, $teacherA] = $this->createTeacherUser();
        [, $teacherB] = $this->createTeacherUser();

        $this->createCourseForTeacher($teacherA, [
            'name' => 'Math 10A',
            'code' => 'M10A',
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'room' => 'Salle 101',
        ]);
        $this->createCourseForTeacher($teacherB, [
            'name' => 'Physics 10A',
            'code' => 'P10A',
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'room' => 'Lab 1',
        ]);
        $this->createCourseForTeacher($teacherA, [
            'name' => 'French 10A',
            'code' => 'F10A',
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'room' => 'Salle 102',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/timetables/auto-generate', [
            'class_section_id' => $section->id,
        ])->assertOk();

        $grid = $response->json('data');
        $this->assertNotEmpty($grid['sessions']);
        $this->assertTrue($grid['timetable']['is_published']);
        $this->assertEmpty($grid['conflicts']);
        $this->assertArrayHasKey('generation_summary', $grid);

        $summary = $grid['generation_summary'];
        $this->assertGreaterThan(0, $summary['sessions_generated']);
        $this->assertGreaterThan(0, $summary['morning_sessions']);
        $this->assertGreaterThan(0, $summary['afternoon_sessions']);
        $this->assertNotEmpty($summary['teacher_workload']);
        $this->assertCount(5, $summary['daily_balance']);

        foreach ($grid['sessions'] as $session) {
            $start = strtotime($session['start_time']);
            $end = strtotime($session['end_time']);
            $this->assertGreaterThanOrEqual(120, ($end - $start) / 60);
        }

        [$studentUser, $student] = $this->createStudentUser();
        $student->update(['grade_level' => 'Grade 10', 'section' => 'A']);

        Sanctum::actingAs($studentUser);

        $this->getJson('/api/timetables/mine')
            ->assertOk()
            ->assertJsonPath('data.class_section.label', 'Grade 10 A');
    }

    public function test_teacher_double_booking_is_rejected(): void
    {
        $admin = $this->createAdminUser();
        [, $teacher] = $this->createTeacherUser();

        $sectionA = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'label' => '10 A',
            'is_active' => true,
        ]);
        $sectionB = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'B',
            'label' => '10 B',
            'is_active' => true,
        ]);

        $courseA = $this->createCourseForTeacher($teacher, ['code' => 'CA', 'grade_level' => 'Grade 10']);
        $courseB = $this->createCourseForTeacher($teacher, ['code' => 'CB', 'grade_level' => 'Grade 10']);

        $ttA = Timetable::create(['class_section_id' => $sectionA->id, 'name' => 'A']);
        $ttB = Timetable::create(['class_section_id' => $sectionB->id, 'name' => 'B']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/timetables/{$ttA->id}/entries", [
            'day_of_week' => 3,
            'start_time' => '08:00',
            'end_time' => '10:00',
            'course_id' => $courseA->id,
            'teacher_id' => $teacher->id,
        ])->assertOk();

        $this->postJson("/api/timetables/{$ttB->id}/entries", [
            'day_of_week' => 3,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'course_id' => $courseB->id,
            'teacher_id' => $teacher->id,
        ])->assertStatus(422);
    }

    public function test_teacher_sees_published_sessions_via_mine(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();

        $section = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'label' => 'Grade 10 A',
            'is_active' => true,
        ]);

        $course = $this->createCourseForTeacher($teacher, ['grade_level' => 'Grade 10']);

        $timetable = Timetable::create([
            'class_section_id' => $section->id,
            'name' => '10 A',
            'is_published' => true,
        ]);

        TimetableEntry::create([
            'timetable_id' => $timetable->id,
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '10:00',
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'room' => 'Salle 12',
        ]);

        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/timetables/mine')
            ->assertOk()
            ->assertJsonPath('data.teacher.id', $teacher->id)
            ->assertJsonCount(1, 'data.sessions')
            ->assertJsonStructure(['data' => ['cells', 'days', 'sessions', 'reschedule_requests']]);
    }

    public function test_auto_generation_uses_two_hour_blocks(): void
    {
        $admin = $this->createAdminUser();

        $section = ClassSection::create([
            'grade_level' => 'Grade 9',
            'section' => 'A',
            'label' => 'Grade 9 A',
            'is_active' => true,
        ]);

        [, $teacher] = $this->createTeacherUser();
        $this->createCourseForTeacher($teacher, [
            'name' => 'History 9A',
            'code' => 'H9A',
            'grade_level' => 'Grade 9',
            'section' => 'A',
        ]);

        Sanctum::actingAs($admin);

        $periods = $this->getJson('/api/timetables/meta')
            ->assertOk()
            ->json('data.periods');

        $this->assertCount(4, $periods);
        $this->assertSame('08:00', $periods[0]['start']);
        $this->assertSame('10:00', $periods[0]['end']);

        $sessions = $this->postJson('/api/timetables/auto-generate', [
            'class_section_id' => $section->id,
        ])->assertOk()->json('data.sessions');

        $allowedStarts = ['08:00', '10:00', '14:00', '16:00'];
        foreach ($sessions as $session) {
            $this->assertContains($session['start_time'], $allowedStarts);
            $this->assertContains($session['end_time'], ['10:00', '12:00', '16:00', '18:00']);
        }
    }
}
