<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class StudentIdValidationTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_can_update_student_without_changing_student_id(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        [, $student] = $this->createStudentUser();
        $student->update(['student_id' => 'STU20260099']);

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'Updated Name',
            'student_id' => 'STU20260099',
            'grade_level' => 'Grade 10',
        ])->assertOk()
            ->assertJsonPath('data.student_id', 'STU20260099');
    }

    public function test_create_student_rejects_duplicate_active_student_id(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        [, $existing] = $this->createStudentUser();
        $existing->update(['student_id' => 'STU20260100']);

        $this->postJson('/api/students', [
            'name' => 'Another Student',
            'email' => 'another.student@test.com',
            'password' => 'password123',
            'student_id' => 'STU20260100',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['student_id']);
    }

    public function test_admin_can_fetch_student_stats(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->getJson('/api/students-stats')
            ->assertOk()
            ->assertJsonStructure(['total', 'active', 'inactive', 'graduated']);
    }

    public function test_create_student_auto_generates_id_when_field_omitted(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/students', [
            'name' => 'Auto Id Student',
            'email' => 'auto.id@test.com',
            'password' => 'password123',
        ])->assertCreated();

        $this->assertNotEmpty($response->json('data.student_id'));
    }
}
