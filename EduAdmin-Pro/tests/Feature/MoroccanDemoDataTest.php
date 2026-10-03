<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Group;
use App\Models\ParentModel;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Models\VirtualMeeting;
use App\Services\FreshDeploymentService;
use Database\Seeders\MoroccanDemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MoroccanDemoDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_moroccan_demo_seeder_populates_realistic_data(): void
    {
        $this->seed();
        $this->seed(MoroccanDemoDataSeeder::class);

        $this->assertSame(64, Student::count());
        $this->assertSame(10, Teacher::count());
        $this->assertSame(32, ParentModel::count());
        $this->assertGreaterThanOrEqual(20, Course::whereIn('grade_level', ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])->count());
        $this->assertSame(8, ClassSection::count());
        $this->assertSame(8, Timetable::where('is_published', true)->count());
        $this->assertGreaterThanOrEqual(72, TimetableEntry::count());
        $this->assertGreaterThan(500, Grade::count());
        $this->assertGreaterThan(50, Assignment::count());
        $this->assertGreaterThan(0, Group::count());
        $this->assertGreaterThan(0, VirtualMeeting::count());

        $this->assertTrue(
            User::where('email', 'youssef.el.amrani@student.eduadmin.com')->exists()
        );
        $this->assertTrue(
            User::where('email', 'mohamed.el.alaoui@teacher.eduadmin.com')->exists()
        );
    }

    public function test_super_admin_can_access_dashboard_after_moroccan_seed(): void
    {
        $this->seed();
        $this->seed(MoroccanDemoDataSeeder::class);

        $admin = User::where('email', FreshDeploymentService::SUPER_ADMIN_EMAIL)->first();
        Sanctum::actingAs($admin);

        $this->getJson('/api/dashboard')->assertOk();
    }
}
