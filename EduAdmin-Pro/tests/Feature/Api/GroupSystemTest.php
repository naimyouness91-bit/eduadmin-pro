<?php

namespace Tests\Feature\Api;

use App\Models\Group;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class GroupSystemTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_admin_can_create_group_and_add_members(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        [$studentUser, $student] = $this->createStudentUser();

        $response = $this->postJson('/api/groups', [
            'name' => 'Physics Club',
            'type' => Group::TYPE_STUDENT,
            'description' => 'Study group',
            'student_ids' => [$student->id],
        ])->assertCreated();

        $groupId = $response->json('data.id');
        $this->assertDatabaseHas('groups', ['name' => 'Physics Club', 'type' => Group::TYPE_STUDENT]);
        $this->assertDatabaseHas('group_members', ['group_id' => $groupId, 'user_id' => $studentUser->id]);
    }

    public function test_student_only_sees_member_groups(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        $admin = $this->createAdminUser();

        Sanctum::actingAs($admin);
        $memberGroup = $this->postJson('/api/groups', [
            'name' => 'Member Group',
            'type' => Group::TYPE_STUDENT,
            'student_ids' => [$student->id],
        ])->json('data.id');

        $this->postJson('/api/groups', [
            'name' => 'Hidden Group',
            'type' => Group::TYPE_TEACHER,
        ])->assertCreated();

        Sanctum::actingAs($studentUser);

        $list = $this->getJson('/api/groups')->assertOk()->json('data');
        $this->assertCount(1, $list);
        $this->assertSame($memberGroup, $list[0]['id']);
    }

    public function test_group_messages_and_file_sharing(): void
    {
        Storage::fake('public');
        $admin = $this->createAdminUser();
        [$studentUser, $student] = $this->createStudentUser();

        Sanctum::actingAs($admin);
        $groupId = $this->postJson('/api/groups', [
            'name' => 'Files Group',
            'type' => Group::TYPE_MIXED,
            'student_ids' => [$student->id],
            'allow_student_messages' => true,
            'allow_student_files' => true,
        ])->json('data.id');

        $this->postJson("/api/groups/{$groupId}/messages", [
            'content' => 'Welcome everyone!',
        ])->assertCreated();

        $this->postJson("/api/groups/{$groupId}/files", [
            'file' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
            'description' => 'Lecture notes',
        ])->assertCreated();

        Sanctum::actingAs($studentUser);

        $this->getJson("/api/groups/{$groupId}/messages")
            ->assertOk()
            ->assertJsonPath('data.0.content', 'Welcome everyone!');

        $files = $this->getJson("/api/groups/{$groupId}/files")->assertOk()->json('data');
        $this->assertCount(1, $files);
        $this->assertSame('notes.pdf', $files[0]['file_name']);
    }

    public function test_student_cannot_message_when_disabled(): void
    {
        $admin = $this->createAdminUser();
        [$studentUser, $student] = $this->createStudentUser();

        Sanctum::actingAs($admin);
        $groupId = $this->postJson('/api/groups', [
            'name' => 'Read only',
            'type' => Group::TYPE_STUDENT,
            'student_ids' => [$student->id],
            'allow_student_messages' => false,
        ])->json('data.id');

        GroupMember::where('group_id', $groupId)
            ->where('user_id', $studentUser->id)
            ->update(['can_send_messages' => false]);

        Sanctum::actingAs($studentUser);

        $this->postJson("/api/groups/{$groupId}/messages", [
            'content' => 'Hello',
        ])->assertForbidden();
    }

    public function test_teacher_can_create_course_group(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Math 101', 'code' => 'M101']);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);

        $groupId = $this->postJson('/api/groups', [
            'name' => 'Math 101 Class',
            'type' => Group::TYPE_COURSE,
            'course_id' => $course->id,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('group_members', [
            'group_id' => $groupId,
            'user_id' => $studentUser->id,
        ]);

        $this->postJson("/api/groups/{$groupId}/announcements", [
            'title' => 'Exam reminder',
            'content' => 'Midterm next week.',
        ])->assertCreated();

        $announcement = GroupMessage::where('type', GroupMessage::TYPE_ANNOUNCEMENT)->first();
        $this->assertSame('Exam reminder', $announcement->metadata['title']);
    }

    public function test_non_member_cannot_access_group(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        $groupId = $this->postJson('/api/groups', [
            'name' => 'Private',
            'type' => Group::TYPE_TEACHER,
        ])->json('data.id');

        [$otherStudent] = $this->createStudentUser();
        Sanctum::actingAs($otherStudent);

        $this->getJson("/api/groups/{$groupId}")->assertForbidden();
    }

    public function test_admin_can_create_all_students_group(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        [$s1] = $this->createStudentUser();
        [$s2] = $this->createStudentUser();

        $groupId = $this->postJson('/api/groups', [
            'name' => 'All Students',
            'type' => Group::TYPE_STUDENT,
            'audience' => Group::AUDIENCE_ALL_STUDENTS,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('group_members', ['group_id' => $groupId, 'user_id' => $s1->id]);
        $this->assertDatabaseHas('group_members', ['group_id' => $groupId, 'user_id' => $s2->id]);
    }

    public function test_admin_can_create_final_year_and_scholarship_groups(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        [, $finalYear] = $this->createStudentUser();
        $finalYear->update(['grade_level' => 'Grade 12']);

        [, $scholar] = $this->createStudentUser();
        $scholar->update(['is_scholarship' => true, 'grade_level' => 'Grade 10']);

        [, $other] = $this->createStudentUser();
        $other->update(['grade_level' => 'Grade 10', 'is_scholarship' => false]);

        $finalGroupId = $this->postJson('/api/groups', [
            'name' => 'Final Year Students',
            'type' => Group::TYPE_STUDENT,
            'audience' => Group::AUDIENCE_FINAL_YEAR,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('group_members', [
            'group_id' => $finalGroupId,
            'user_id' => $finalYear->user_id,
        ]);
        $this->assertDatabaseMissing('group_members', [
            'group_id' => $finalGroupId,
            'user_id' => $other->user_id,
        ]);

        $scholarGroupId = $this->postJson('/api/groups', [
            'name' => 'Scholarship Students',
            'type' => Group::TYPE_STUDENT,
            'audience' => Group::AUDIENCE_SCHOLARSHIP,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('group_members', [
            'group_id' => $scholarGroupId,
            'user_id' => $scholar->user_id,
        ]);
    }

    public function test_admin_can_create_teachers_and_students_mixed_group(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        [$studentUser] = $this->createStudentUser();
        [$teacherUser] = $this->createTeacherUser();

        $groupId = $this->postJson('/api/groups', [
            'name' => 'Teachers & Students',
            'type' => Group::TYPE_MIXED,
            'audience' => Group::AUDIENCE_ALL_STUDENTS,
            'include_all_teachers' => true,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('group_members', ['group_id' => $groupId, 'user_id' => $studentUser->id]);
        $this->assertDatabaseHas('group_members', ['group_id' => $groupId, 'user_id' => $teacherUser->id]);

        $this->postJson("/api/groups/{$groupId}/announcements", [
            'title' => 'Welcome',
            'content' => 'School-wide update',
        ])->assertCreated();
    }

    public function test_admin_presets_endpoint(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->getJson('/api/groups/presets')
            ->assertOk()
            ->assertJsonFragment(['name' => 'All Students'])
            ->assertJsonFragment(['name' => 'Teachers & Students']);
    }

    public function test_teacher_cannot_create_non_course_group(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Laravel', 'code' => 'LRV-1']);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/groups', [
            'name' => 'Invalid Mixed',
            'type' => Group::TYPE_MIXED,
            'course_id' => $course->id,
        ])->assertStatus(201);

        $this->assertDatabaseHas('groups', [
            'name' => 'Invalid Mixed',
            'type' => Group::TYPE_COURSE,
        ]);
    }

    public function test_teacher_can_create_database_style_course_group(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        [, $otherStudent] = $this->createStudentUser();

        $course = $this->createCourseForTeacher($teacher, ['name' => 'Database', 'code' => 'DB-101']);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);

        $groupId = $this->postJson('/api/groups', [
            'name' => 'Database Group',
            'type' => Group::TYPE_COURSE,
            'course_id' => $course->id,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('group_members', ['group_id' => $groupId, 'user_id' => $studentUser->id]);
        $this->assertDatabaseMissing('group_members', ['group_id' => $groupId, 'user_id' => $otherStudent->user_id]);

        $this->postJson("/api/groups/{$groupId}/members", [
            'student_ids' => [$otherStudent->id],
        ])->assertStatus(422);

        Sanctum::actingAs($studentUser);
        $this->getJson("/api/groups/{$groupId}")->assertOk();

        Sanctum::actingAs($otherStudent->user);
        $this->getJson("/api/groups/{$groupId}")->assertForbidden();
    }

    public function test_teacher_course_group_features(): void
    {
        Storage::fake('public');
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Mathematics', 'code' => 'MATH-1']);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        $assignment = \App\Models\Assignment::create([
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Homework 1',
            'description' => 'Solve problems',
            'due_date' => now()->addWeek(),
            'status' => 'published',
        ]);

        Sanctum::actingAs($teacherUser);

        $groupId = $this->postJson('/api/groups', [
            'name' => 'Mathematics Group',
            'type' => Group::TYPE_COURSE,
            'course_id' => $course->id,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/groups/{$groupId}/discussions", [
            'title' => 'Chapter 1 help',
            'content' => 'Ask questions here.',
        ])->assertCreated();

        $this->postJson("/api/groups/{$groupId}/sessions", [
            'title' => 'Review session',
            'meeting_url' => 'https://meet.example.com/math',
            'starts_at' => now()->addDay()->toIso8601String(),
        ])->assertCreated();

        $this->postJson("/api/groups/{$groupId}/assignments", [
            'assignment_id' => $assignment->id,
        ])->assertCreated();

        $this->postJson("/api/groups/{$groupId}/files", [
            'file' => UploadedFile::fake()->create('worksheet.pdf', 50, 'application/pdf'),
        ])->assertCreated();

        Sanctum::actingAs($studentUser);

        $types = collect($this->getJson("/api/groups/{$groupId}/messages")->assertOk()->json('data'))->pluck('type');
        $this->assertTrue($types->contains('discussion'));
        $this->assertTrue($types->contains(GroupMessage::TYPE_FILE));
    }

    public function test_teacher_presets_lists_assigned_courses(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        $this->createCourseForTeacher($teacher, ['name' => 'Laravel', 'code' => 'LRV']);

        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/groups/teacher-presets')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Laravel Group']);
    }

    public function test_existing_manual_group_still_works(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        [$studentUser, $student] = $this->createStudentUser();

        $groupId = $this->postJson('/api/groups', [
            'name' => 'Physics Club',
            'type' => Group::TYPE_STUDENT,
            'audience' => Group::AUDIENCE_CUSTOM,
            'student_ids' => [$student->id],
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('groups', [
            'id' => $groupId,
            'audience' => Group::AUDIENCE_CUSTOM,
        ]);

        $this->postJson("/api/groups/{$groupId}/messages", [
            'content' => 'Hello club',
        ])->assertCreated();

        Sanctum::actingAs($studentUser);
        $this->getJson("/api/groups/{$groupId}")->assertOk();
    }
}
