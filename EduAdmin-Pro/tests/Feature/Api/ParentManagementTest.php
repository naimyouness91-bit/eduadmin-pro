<?php

namespace Tests\Feature\Api;

use App\Models\ParentModel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ParentManagementTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_can_list_parents(): void
    {
        [$parentUser] = $this->createParentUser();
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/parents')->assertOk();

        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
        $this->assertSame($parentUser->email, $response->json('data.0.email'));
    }

    public function test_admin_can_search_and_filter_parents(): void
    {
        [$linkedUser] = $this->createParentUser();
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->getJson('/api/parents?search='.$linkedUser->name)
            ->assertOk()
            ->assertJsonPath('data.0.name', $linkedUser->name);

        $this->getJson('/api/parents?linked=yes')
            ->assertOk()
            ->assertJsonPath('data.0.students_count', 1);

        $this->getJson('/api/parents?status=active')->assertOk();
    }

    public function test_admin_can_create_update_and_delete_parent(): void
    {
        [, $student] = $this->createStudentUser();
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $create = $this->postJson('/api/parents', [
            'name' => 'New Parent',
            'email' => 'newparent@test.com',
            'password' => 'password123',
            'phone' => '555-0100',
            'relationship' => 'guardian',
            'student_ids' => [$student->id],
        ])->assertCreated();

        $parentId = $create->json('data.id');
        $this->assertSame('New Parent', $create->json('data.name'));
        $this->assertSame(1, $create->json('data.students_count'));

        $this->putJson("/api/parents/{$parentId}", [
            'name' => 'Updated Parent',
            'phone' => '555-0200',
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Updated Parent')
            ->assertJsonPath('data.is_active', false);

        $this->deleteJson("/api/parents/{$parentId}")->assertOk();
        $this->assertSoftDeleted('parents', ['id' => $parentId]);
        $this->assertSoftDeleted('users', ['email' => 'newparent@test.com']);
    }

    public function test_admin_can_link_students_to_parent(): void
    {
        [, $parent, $student] = $this->createParentUser();
        [, $secondStudent] = $this->createStudentUser();
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/parents/{$parent->id}/link-students", [
            'student_ids' => [$student->id, $secondStudent->id],
            'relationship' => 'guardian',
        ])->assertOk();

        $this->assertSame(2, $response->json('data.students_count'));
        $this->assertDatabaseHas('parent_student', [
            'parent_id' => $parent->id,
            'student_id' => $secondStudent->id,
        ]);
    }

    public function test_teacher_and_parent_cannot_access_parent_management(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        [$parentUser] = $this->createParentUser();

        Sanctum::actingAs($teacherUser);
        $this->getJson('/api/parents')->assertForbidden();

        Sanctum::actingAs($parentUser);
        $this->getJson('/api/parents')->assertForbidden();
    }

    public function test_parent_portal_still_works_after_management_crud(): void
    {
        [, $student] = $this->createStudentUser();
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $create = $this->postJson('/api/parents', [
            'name' => 'Portal Parent',
            'email' => 'portalparent@test.com',
            'password' => 'password123',
            'student_ids' => [$student->id],
        ])->assertCreated();

        $parentId = $create->json('data.id');
        $parentUser = User::where('email', 'portalparent@test.com')->first();
        $this->assertNotNull($parentUser);
        $this->assertTrue($parentUser->isParent());

        Sanctum::actingAs($parentUser);
        $this->getJson('/api/parent/children')->assertOk()
            ->assertJsonPath('data.0.student.id', $student->id);

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/parents/{$parentId}")->assertOk();

        $this->assertNull(ParentModel::find($parentId));
    }
}
