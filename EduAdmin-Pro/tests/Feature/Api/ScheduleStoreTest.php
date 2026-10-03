<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ScheduleStoreTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_store_accepts_time_with_seconds_and_strips_to_hi(): void
    {
        $admin = $this->createAdminUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($admin);

        $this->postJson('/api/schedules', [
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'day_of_week' => 1,
            'start_time' => '08:30:00',
            'end_time' => '10:30:00',
            'room' => 'Salle 1',
        ])
            ->assertCreated()
            ->assertJsonPath('data.start_time', fn ($v) => str_starts_with((string) $v, '08:30'));
    }
}
