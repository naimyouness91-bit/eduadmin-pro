<?php

namespace Tests\Feature\Parent;

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ParentDashboardTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_parent_role_exists_in_database(): void
    {
        [$parentUser] = $this->createParentUser();

        $this->assertSame('parent', $parentUser->role);
        $this->assertTrue($parentUser->isParent());
    }

    public function test_parent_can_access_api_dashboard(): void
    {
        [$parentUser] = $this->createParentUser();
        Sanctum::actingAs($parentUser);

        $response = $this->getJson('/api/dashboard')->assertOk();

        $this->assertSame('parent', $response->json('role'));
        $this->assertNotEmpty($response->json('children'));
        $this->assertArrayHasKey('performance', $response->json());
    }

    public function test_parent_can_list_linked_children_via_api(): void
    {
        [$parentUser, , $student] = $this->createParentUser();
        Sanctum::actingAs($parentUser);

        $response = $this->getJson('/api/parent/children')->assertOk();

        $ids = collect($response->json('data'))->pluck('student.id');
        $this->assertContains($student->id, $ids->all());
    }

    public function test_parent_cannot_view_unlinked_child(): void
    {
        [$parentUser] = $this->createParentUser();
        [, $otherStudent] = $this->createStudentUser();

        Sanctum::actingAs($parentUser);

        $this->getJson("/api/parent/children/{$otherStudent->id}")->assertForbidden();
    }

    public function test_student_cannot_access_parent_portal_routes(): void
    {
        [$studentUser] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/parent/children')->assertForbidden();
    }

    public function test_admin_cannot_access_parent_portal_routes(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->getJson('/api/parent/children')->assertForbidden();
    }

    public function test_parent_web_dashboard_requires_parent_role(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        $this->get('/parent/dashboard')->assertForbidden();
    }

    public function test_parent_web_dashboard_renders_for_parent(): void
    {
        [$parentUser, , $student] = $this->createParentUser();
        Sanctum::actingAs($parentUser);

        $this->get('/parent/dashboard')
            ->assertOk()
            ->assertSee('Parent portal')
            ->assertSee($student->user->name);
    }

    public function test_parent_can_view_child_profile_page(): void
    {
        [$parentUser, , $student] = $this->createParentUser();
        Sanctum::actingAs($parentUser);

        $this->get(route('parent.children.show', $student))
            ->assertOk()
            ->assertSee('Average grade');
    }

    public function test_parent_child_routes_use_student_binding_without_conflict(): void
    {
        [$parentUser, , $student] = $this->createParentUser();
        Sanctum::actingAs($parentUser);

        $this->get(route('parent.children.grades', $student))->assertOk();
        $this->get(route('parent.children.attendance', $student))->assertOk();
        $this->get(route('parent.children.schedule', $student))->assertOk();
    }
}
