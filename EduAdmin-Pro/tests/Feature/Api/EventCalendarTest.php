<?php

namespace Tests\Feature\Api;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class EventCalendarTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_can_create_update_and_delete_event(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $create = $this->postJson('/api/events', [
            'title' => 'Final Exam',
            'description' => 'Grade 10 finals',
            'start_date' => now()->addDays(3)->toDateTimeString(),
            'end_date' => now()->addDays(3)->addHours(2)->toDateTimeString(),
            'type' => 'exam',
            'is_public' => true,
        ])->assertCreated();

        $eventId = $create->json('data.id');
        $this->assertSame('exam', $create->json('data.type'));
        $this->assertSame('#ef4444', $create->json('data.color'));

        $this->putJson("/api/events/{$eventId}", [
            'title' => 'Final Exam Updated',
            'type' => 'meeting',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Final Exam Updated')
            ->assertJsonPath('data.type', 'meeting')
            ->assertJsonPath('data.color', '#6366f1');

        $this->deleteJson("/api/events/{$eventId}")->assertOk();
        $this->assertDatabaseMissing('events', ['id' => $eventId]);
    }

    public function test_event_type_validation_rejects_invalid_type(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->postJson('/api/events', [
            'title' => 'Bad Type',
            'start_date' => now()->toDateTimeString(),
            'end_date' => now()->addHour()->toDateTimeString(),
            'type' => 'invalid',
        ])->assertUnprocessable();
    }

    public function test_events_index_filters_by_date_range_and_type(): void
    {
        $admin = $this->createAdminUser();

        Event::create([
            'title' => 'In Range Exam',
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(2)->addHours(1),
            'type' => 'exam',
            'color' => '#ef4444',
            'is_public' => true,
            'created_by' => $admin->id,
        ]);

        Event::create([
            'title' => 'Out of Range',
            'start_date' => now()->addMonths(2),
            'end_date' => now()->addMonths(2)->addHours(1),
            'type' => 'holiday',
            'color' => '#22c55e',
            'is_public' => true,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $from = now()->toDateString();
        $to = now()->addDays(10)->toDateString();

        $response = $this->getJson("/api/events?from={$from}&to={$to}&type=exam")->assertOk();

        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertContains('In Range Exam', $titles);
        $this->assertNotContains('Out of Range', $titles);
    }

    public function test_student_only_sees_public_events(): void
    {
        $admin = $this->createAdminUser();
        [$studentUser] = $this->createStudentUser();

        Event::create([
            'title' => 'Public Holiday',
            'start_date' => now()->addDay(),
            'end_date' => now()->addDays(2),
            'type' => 'holiday',
            'color' => '#22c55e',
            'is_public' => true,
            'created_by' => $admin->id,
        ]);

        Event::create([
            'title' => 'Private Admin Meeting',
            'start_date' => now()->addDay(),
            'end_date' => now()->addDays(1)->addHour(),
            'type' => 'meeting',
            'color' => '#6366f1',
            'is_public' => false,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($studentUser);

        $titles = collect($this->getJson('/api/events')->json('data'))->pluck('title')->all();

        $this->assertContains('Public Holiday', $titles);
        $this->assertNotContains('Private Admin Meeting', $titles);
    }

    public function test_teacher_cannot_create_events(): void
    {
        [$teacherUser] = $this->createTeacherUser();

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/events', [
            'title' => 'Teacher Event',
            'start_date' => now()->toDateTimeString(),
            'end_date' => now()->addHour()->toDateTimeString(),
            'type' => 'event',
        ])->assertForbidden();
    }
}
