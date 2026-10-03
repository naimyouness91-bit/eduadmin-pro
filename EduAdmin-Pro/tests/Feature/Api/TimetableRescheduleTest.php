<?php

namespace Tests\Feature\Api;

use App\Models\ClassSection;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\TimetableRescheduleRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class TimetableRescheduleTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    protected function publishedEntry(int $teacherId, array $overrides = []): TimetableEntry
    {
        $section = ClassSection::create([
            'grade_level' => 'Grade 10',
            'section' => 'A',
            'label' => 'Grade 10 A',
            'is_active' => true,
        ]);

        $course = $this->createCourseForTeacher(
            \App\Models\Teacher::find($teacherId),
            ['grade_level' => 'Grade 10', 'section' => 'A', 'room' => 'Salle 101']
        );

        $timetable = Timetable::create([
            'class_section_id' => $section->id,
            'name' => '10 A',
            'is_published' => true,
        ]);

        return TimetableEntry::create(array_merge([
            'timetable_id' => $timetable->id,
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '10:00',
            'course_id' => $course->id,
            'teacher_id' => $teacherId,
            'room' => 'Salle 101',
            'session_status' => TimetableEntry::STATUS_SCHEDULED,
        ], $overrides));
    }

    public function test_teacher_can_list_available_free_slots(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $entry = $this->publishedEntry($teacher->id);

        Sanctum::actingAs($teacherUser);

        $response = $this->getJson("/api/timetable-entries/{$entry->id}/available-slots")
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($response['available_slots']);
        $mondayMorning = collect($response['available_slots'])->contains(
            fn ($s) => (int) $s['day_of_week'] === 1 && $s['start_time'] === '08:00'
        );
        $this->assertFalse($mondayMorning);
        $this->assertTrue(
            collect($response['available_slots'])->contains(fn ($s) => $s['start_time'] === '14:00')
        );
    }

    public function test_teacher_can_submit_and_admin_can_approve_reschedule(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $admin = $this->createAdminUser();
        $entry = $this->publishedEntry($teacher->id);

        Sanctum::actingAs($teacherUser);

        $slots = $this->getJson("/api/timetable-entries/{$entry->id}/available-slots")
            ->assertOk()
            ->json('data.available_slots');

        $target = collect($slots)->first(fn ($s) => $s['start_time'] === '14:00' && $s['day_of_week'] === 3);

        $requestId = $this->postJson("/api/timetable-entries/{$entry->id}/reschedule-requests", [
            'proposed_day_of_week' => $target['day_of_week'],
            'proposed_start_time' => $target['start_time'],
            'proposed_end_time' => $target['end_time'],
            'reason' => 'Training workshop',
        ])->assertCreated()
            ->json('data.id');

        $this->assertDatabaseHas('timetable_reschedule_requests', [
            'id' => $requestId,
            'status' => TimetableRescheduleRequest::STATUS_PENDING,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/timetable-reschedule-requests/{$requestId}/approve")
            ->assertOk();

        $entry->refresh();
        $this->assertSame(3, $entry->day_of_week);
        $this->assertSame('14:00', substr($entry->start_time, 0, 5));
        $this->assertSame(TimetableEntry::STATUS_RESCHEDULED, $entry->session_status);

        $this->assertDatabaseHas('timetable_reschedule_requests', [
            'id' => $requestId,
            'status' => TimetableRescheduleRequest::STATUS_APPROVED,
        ]);
    }

    public function test_teacher_cannot_reschedule_another_teachers_session(): void
    {
        [, $teacherA] = $this->createTeacherUser();
        [$teacherUserB] = $this->createTeacherUser();
        $entry = $this->publishedEntry($teacherA->id);

        Sanctum::actingAs($teacherUserB);

        $this->getJson("/api/timetable-entries/{$entry->id}/available-slots")
            ->assertForbidden();
    }

    public function test_occupied_slots_are_not_offered(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $entry = $this->publishedEntry($teacher->id);

        TimetableEntry::create([
            'timetable_id' => $entry->timetable_id,
            'day_of_week' => 3,
            'start_time' => '14:00',
            'end_time' => '16:00',
            'course_id' => $entry->course_id,
            'teacher_id' => $teacher->id,
            'room' => 'Salle 102',
            'session_status' => TimetableEntry::STATUS_SCHEDULED,
        ]);

        Sanctum::actingAs($teacherUser);

        $slots = $this->getJson("/api/timetable-entries/{$entry->id}/available-slots")
            ->assertOk()
            ->json('data.available_slots');

        $blocked = collect($slots)->contains(
            fn ($s) => (int) $s['day_of_week'] === 3 && $s['start_time'] === '14:00'
        );

        $this->assertFalse($blocked);
    }

    public function test_admin_receives_notification_on_request(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $admin = $this->createAdminUser();
        $entry = $this->publishedEntry($teacher->id);

        Sanctum::actingAs($teacherUser);

        $slot = $this->getJson("/api/timetable-entries/{$entry->id}/available-slots")
            ->json('data.available_slots.0');

        $this->postJson("/api/timetable-entries/{$entry->id}/reschedule-requests", [
            'proposed_day_of_week' => $slot['day_of_week'],
            'proposed_start_time' => $slot['start_time'],
            'proposed_end_time' => $slot['end_time'],
        ])->assertCreated();

        $admin->refresh();
        $this->assertTrue(
            $admin->notifications()->where('data->category', 'timetable')->exists()
        );
    }
}
