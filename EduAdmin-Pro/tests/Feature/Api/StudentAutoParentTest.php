<?php

namespace Tests\Feature\Api;

use App\Models\ParentModel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class StudentAutoParentTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_student_creation_without_parent_option_unchanged(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/students', [
            'name' => 'Sara Student',
            'email' => 'sara.student@test.com',
            'password' => 'password123',
            'grade_level' => 'Grade 10',
        ])->assertCreated();

        $this->assertArrayNotHasKey('parent_credentials', $response->json());
        $this->assertSame(0, ParentModel::count());
    }

    public function test_admin_can_create_student_with_auto_parent_account(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/students', [
            'name' => 'Karim Student',
            'email' => 'karim.student@test.com',
            'password' => 'password123',
            'grade_level' => 'Grade 10',
            'create_parent_account' => true,
            'parent_name' => 'Hassan Parent',
            'parent_email' => 'hassan.parent@test.com',
            'parent_phone' => '+212 600000000',
            'parent_relationship' => 'father',
        ])->assertCreated();

        $studentId = $response->json('data.id');
        $this->assertNotNull($response->json('parent_credentials.temporary_password'));
        $this->assertSame('hassan.parent@test.com', $response->json('parent_credentials.email'));

        $parent = ParentModel::whereHas('user', fn ($q) => $q->where('email', 'hassan.parent@test.com'))->first();
        $this->assertNotNull($parent);
        $this->assertTrue($parent->students()->where('students.id', $studentId)->exists());
        $this->assertDatabaseHas('parent_student', [
            'parent_id' => $parent->id,
            'student_id' => $studentId,
            'relationship' => 'father',
            'is_primary' => true,
        ]);
    }

    public function test_auto_created_parent_can_log_in_and_access_portal(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/students', [
            'name' => 'Nadia Student',
            'email' => 'nadia.student@test.com',
            'password' => 'password123',
            'grade_level' => 'Grade 9',
            'create_parent_account' => true,
            'parent_name' => 'Fatima Parent',
            'parent_email' => 'fatima.parent@test.com',
            'parent_relationship' => 'mother',
        ])->assertCreated();

        $studentId = $response->json('data.id');
        $tempPassword = $response->json('parent_credentials.temporary_password');

        $login = $this->postJson('/api/auth/login', [
            'email' => 'fatima.parent@test.com',
            'password' => $tempPassword,
        ])->assertOk();

        $parentUser = User::where('email', 'fatima.parent@test.com')->first();
        $this->assertTrue($parentUser->isParent());

        Sanctum::actingAs($parentUser);
        $this->getJson('/api/parent/children')->assertOk()
            ->assertJsonPath('data.0.student.id', $studentId);
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('role', 'parent');
    }

    public function test_parent_fields_required_when_auto_create_checked(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->postJson('/api/students', [
            'name' => 'Incomplete Student',
            'email' => 'incomplete.student@test.com',
            'password' => 'password123',
            'create_parent_account' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['parent_name', 'parent_email', 'parent_relationship']);
    }

    public function test_manual_parent_management_still_works(): void
    {
        [, $student] = $this->createStudentUser();
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->postJson('/api/parents', [
            'name' => 'Manual Parent',
            'email' => 'manual.parent@test.com',
            'password' => 'password123',
            'student_ids' => [$student->id],
        ])->assertCreated();
    }
}
