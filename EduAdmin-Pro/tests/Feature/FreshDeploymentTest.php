<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Student;
use App\Models\SystemSetting;
use App\Models\Teacher;
use App\Models\User;
use App\Services\FreshDeploymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FreshDeploymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_seed_leaves_only_super_admin_and_settings(): void
    {
        $this->seed();

        $this->assertSame(1, User::count());
        $this->assertTrue(User::where('email', FreshDeploymentService::SUPER_ADMIN_EMAIL)->exists());
        $this->assertTrue(SystemSetting::where('key', 'school_name')->exists());
        $this->assertSame(0, Student::count());
        $this->assertSame(0, Teacher::count());
        $this->assertSame(0, Course::count());
    }

    public function test_prepare_fresh_deployment_command_purges_demo_data(): void
    {
        $this->seed();

        User::factory()->student()->create();
        User::factory()->teacher()->create();

        $this->artisan('eduadmin:prepare-fresh-deployment', ['--force' => true])
            ->assertSuccessful();

        $this->assertSame(1, User::count());
        $this->assertSame(0, Student::count());
        $this->assertSame(0, Teacher::count());
    }
}
