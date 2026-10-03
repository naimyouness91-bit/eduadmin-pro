<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_search_requires_minimum_query_length(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->getJson('/api/search?q=a')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_admin_global_search_finds_students_and_teachers(): void
    {
        $admin = $this->createAdminUser();
        [, $student] = $this->createStudentUser();
        $student->user->update(['name' => 'UniqueSearchStudent']);

        [, $teacher] = $this->createTeacherUser();
        $teacher->user->update(['name' => 'UniqueSearchTeacher']);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/search?q=UniqueSearch')->assertOk();

        $this->assertGreaterThanOrEqual(1, count($response->json('students')));
        $this->assertGreaterThanOrEqual(1, count($response->json('teachers')));
    }

    public function test_teacher_search_scopes_students_to_their_courses(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [, $enrolled] = $this->createStudentUser();
        $enrolled->user->update(['name' => 'EnrolledForSearch']);
        $course = $this->createCourseForTeacher($teacher);
        $course->students()->attach($enrolled->id);

        [, $other] = $this->createStudentUser();
        $other->user->update(['name' => 'EnrolledForSearch Other']);

        Sanctum::actingAs($teacherUser);

        $students = $this->getJson('/api/search?q=EnrolledForSearch')
            ->assertOk()
            ->json('students');

        $ids = collect($students)->pluck('id');
        $this->assertContains($enrolled->id, $ids->all());
        $this->assertNotContains($other->id, $ids->all());
    }

    public function test_parent_search_finds_linked_child(): void
    {
        [, , $student] = $this->createParentUser();
        $student->user->update(['name' => 'ChildSearchName']);

        [$parentUser] = $this->createParentUser($student);

        Sanctum::actingAs($parentUser);

        $students = $this->getJson('/api/search?q=ChildSearch')->assertOk()->json('students');

        $this->assertNotEmpty($students);
        $this->assertSame($student->id, $students[0]['id']);
    }

    public function test_search_route_does_not_conflict_with_resource_routes(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->getJson('/api/search?q=test')->assertOk();
        $this->getJson('/api/students')->assertOk();
        $this->getJson('/api/teachers')->assertOk();
    }
}
