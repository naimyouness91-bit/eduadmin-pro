<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\MoroccanDemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeacherDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function seedDemo(): User
    {
        $this->seed();
        $this->seed(MoroccanDemoDataSeeder::class);

        $teacher = User::where('email', 'fatima.zahra.benali@teacher.eduadmin.com')->firstOrFail();
        Sanctum::actingAs($teacher);

        return $teacher;
    }

    public function test_teacher_dashboard_returns_rich_payload(): void
    {
        $this->seedDemo();

        $response = $this->getJson('/api/dashboard')->assertOk();

        $response->assertJsonPath('role', 'teacher');
        $response->assertJsonStructure([
            'role',
            'stats' => [
                'courses_count',
                'students_count',
                'pending_submissions_count',
                'today_sessions_count',
                'today_attendance_count',
            ],
            'my_courses',
            'today_schedule',
            'upcoming_sessions',
            'weekly_hours',
            'recent_grades',
            'recent_absences',
            'recent_activities',
            'pending_submissions',
            'today_attendance',
        ]);

        $stats = $response->json('stats');
        $this->assertGreaterThan(0, $stats['courses_count']);
        $this->assertGreaterThan(0, $stats['students_count']);
        $this->assertNotEmpty($response->json('recent_grades'));
        $this->assertNotEmpty($response->json('weekly_hours'));
    }

    public function test_teacher_dashboard_has_pending_submissions_after_seed(): void
    {
        $this->seedDemo();

        $response = $this->getJson('/api/dashboard')->assertOk();

        $this->assertGreaterThan(
            0,
            $response->json('stats.pending_submissions_count'),
            'Expected pending submissions for teacher dashboard demo'
        );
    }
}
