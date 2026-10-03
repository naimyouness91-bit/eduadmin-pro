<?php

namespace Tests\Feature\Api;

use App\Models\Absence;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class SmartNotificationTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_unread_count_and_mark_read(): void
    {
        $admin = $this->createAdminUser();
        $service = app(NotificationService::class);
        $service->systemAlert($admin, 'Maintenance', 'Scheduled backup tonight.');

        Sanctum::actingAs($admin);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('count', 1);

        $list = $this->getJson('/api/notifications')->assertOk();
        $id = $list->json('data.0.id');

        $this->postJson("/api/notifications/{$id}/read")
            ->assertOk()
            ->assertJsonPath('unread_count', 0)
            ->assertJsonPath('data.category', NotificationService::CATEGORY_SYSTEM);

        $this->getJson('/api/notifications/unread-count')
            ->assertJsonPath('count', 0);
    }

    public function test_mark_all_notifications_read(): void
    {
        $admin = $this->createAdminUser();
        $service = app(NotificationService::class);
        $service->systemAlert($admin, 'Alert 1', 'Body 1');
        $service->systemAlert($admin, 'Alert 2', 'Body 2');

        Sanctum::actingAs($admin);

        $this->postJson('/api/notifications/read-all')->assertOk()->assertJsonPath('unread_count', 0);
        $this->getJson('/api/notifications/unread-count')->assertJsonPath('count', 0);
    }

    public function test_grade_create_notifies_student(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/grades', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Quiz 1',
            'type' => 'quiz',
            'score' => 90,
            'max_score' => 100,
        ])->assertCreated();

        Sanctum::actingAs($studentUser);

        $this->getJson('/api/notifications/unread-count')
            ->assertJsonPath('count', 1);

        $title = collect($this->getJson('/api/notifications')->json('data'))->value('title');
        $this->assertSame('New grade posted', $title);
    }

    public function test_message_send_notifies_receiver(): void
    {
        $admin = $this->createAdminUser();
        [, $teacher] = $this->createTeacherUser();

        Sanctum::actingAs($admin);

        $this->postJson('/api/messages', [
            'receiver_id' => $teacher->user_id,
            'content' => 'Please review the attendance report.',
        ])->assertCreated();

        Sanctum::actingAs($teacher->user);

        $this->getJson('/api/notifications?category=message')
            ->assertOk();

        $notifications = $this->getJson('/api/notifications')->json('data');
        $this->assertNotEmpty($notifications);
        $this->assertSame(NotificationService::CATEGORY_MESSAGE, $notifications[0]['category']);
    }

    public function test_public_event_notifies_student_private_does_not(): void
    {
        $admin = $this->createAdminUser();
        [$studentUser] = $this->createStudentUser();

        Sanctum::actingAs($admin);

        $this->postJson('/api/events', [
            'title' => 'Public Assembly',
            'start_date' => now()->addDay()->toDateTimeString(),
            'end_date' => now()->addDay()->addHours(2)->toDateTimeString(),
            'type' => 'event',
            'is_public' => true,
        ])->assertCreated();

        Sanctum::actingAs($studentUser);
        $this->assertGreaterThanOrEqual(1, $this->getJson('/api/notifications/unread-count')->json('count'));

        Sanctum::actingAs($admin);

        $this->postJson('/api/events', [
            'title' => 'Admin Only Meeting',
            'start_date' => now()->addDays(2)->toDateTimeString(),
            'end_date' => now()->addDays(2)->addHour()->toDateTimeString(),
            'type' => 'meeting',
            'is_public' => false,
        ])->assertCreated();

        Sanctum::actingAs($studentUser);

        $titles = collect($this->getJson('/api/notifications')->json('data'))->pluck('title');
        $this->assertTrue($titles->contains('New school event'));
        $this->assertFalse($titles->contains(fn ($t) => $t === 'Admin Only Meeting' && $titles->filter(fn ($x) => $x === 'New school event')->count() > 1));
    }

    public function test_high_absence_notifies_student_and_parent(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        [$parentUser, , $student] = $this->createParentUser($student);
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($student->id);

        foreach (range(1, 4) as $day) {
            Absence::create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'teacher_id' => $teacher->id,
                'date' => now()->subDays($day)->toDateString(),
                'status' => $day <= 3 ? 'absent' : 'present',
            ]);
        }

        Sanctum::actingAs($this->createAdminUser());

        $this->postJson('/api/attendance/mark', [
            'course_id' => $course->id,
            'student_id' => $student->id,
            'date' => now()->toDateString(),
            'status' => 'absent',
            'teacher_id' => $teacher->id,
        ])->assertSuccessful();

        Sanctum::actingAs($studentUser);
        $this->assertGreaterThanOrEqual(1, $this->getJson('/api/notifications/unread-count')->json('count'));

        Sanctum::actingAs($parentUser);
        $categories = collect($this->getJson('/api/notifications')->json('data'))->pluck('category');
        $this->assertTrue($categories->contains(NotificationService::CATEGORY_ATTENDANCE));
    }
}
