<?php

namespace Tests\Feature\Api;

use App\Models\VirtualMeeting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class VirtualMeetingTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_teacher_can_create_and_share_meeting_link(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Database', 'code' => 'DB']);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);

        $meeting = $this->postJson('/api/meetings', [
            'title' => 'Database Lecture',
            'course_id' => $course->id,
            'scheduled_at' => now()->addDay()->toIso8601String(),
            'invite_course_students' => true,
        ])->assertCreated()->json('data');

        $this->assertStringContainsString('meet.jit.si', $meeting['meeting_url']);
        $this->assertNotEmpty($meeting['jitsi_room_name']);

        Sanctum::actingAs($studentUser);

        $join = $this->postJson("/api/meetings/{$meeting['id']}/join")
            ->assertOk()
            ->json('data');

        $this->assertSame($meeting['jitsi_room_name'], $join['jitsi']['room_name']);
        $this->assertSame('Database Lecture', $join['meeting']['title']);
    }

    public function test_student_cannot_join_without_invitation(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $meetingId = $this->postJson('/api/meetings', [
            'title' => 'Admin only',
            'scheduled_at' => now()->addDay()->toIso8601String(),
        ])->json('data.id');

        [$otherStudentUser] = $this->createStudentUser();
        Sanctum::actingAs($otherStudentUser);

        $this->postJson("/api/meetings/{$meetingId}/join")->assertForbidden();
    }

    public function test_attendance_tracking_on_join_and_leave(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);
        $meetingId = $this->postJson('/api/meetings', [
            'title' => 'Attendance test',
            'course_id' => $course->id,
            'student_ids' => [$student->id],
        ])->json('data.id');

        Sanctum::actingAs($studentUser);
        $this->postJson("/api/meetings/{$meetingId}/join")->assertOk();
        $this->postJson("/api/meetings/{$meetingId}/leave")->assertOk();

        Sanctum::actingAs($teacherUser);
        $attendance = $this->getJson("/api/meetings/{$meetingId}/attendance")
            ->assertOk()
            ->json('data');

        $this->assertTrue(collect($attendance)->firstWhere('user.id', $studentUser->id)['attended']);
    }

    public function test_raise_hand_and_chat(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);
        $meetingId = $this->postJson('/api/meetings', [
            'title' => 'Interactive',
            'course_id' => $course->id,
            'student_ids' => [$student->id],
        ])->json('data.id');

        Sanctum::actingAs($studentUser);
        $this->postJson("/api/meetings/{$meetingId}/raise-hand", ['raised' => true])->assertOk();

        $this->postJson("/api/meetings/{$meetingId}/messages", [
            'content' => 'Hello teacher!',
        ])->assertCreated();

        Sanctum::actingAs($teacherUser);
        $parts = $this->getJson("/api/meetings/{$meetingId}/participants")->assertOk()->json('data');
        $this->assertTrue(collect($parts)->contains(fn ($p) => $p['hand_raised'] === true));

        $this->getJson("/api/meetings/{$meetingId}/messages")
            ->assertOk()
            ->assertJsonPath('data.0.content', 'Hello teacher!');
    }

    public function test_admin_can_invite_teachers_and_students(): void
    {
        Sanctum::actingAs($this->createAdminUser());
        [$studentUser, $student] = $this->createStudentUser();
        [$teacherUser, $teacher] = $this->createTeacherUser();

        $meetingId = $this->postJson('/api/meetings', [
            'title' => 'School assembly',
            'user_ids' => [$studentUser->id, $teacherUser->id],
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('meeting_participants', [
            'virtual_meeting_id' => $meetingId,
            'user_id' => $studentUser->id,
        ]);
    }

    public function test_meeting_resources_download(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->createAdminUser());
        [$studentUser, $student] = $this->createStudentUser();

        $meetingId = $this->postJson('/api/meetings', [
            'title' => 'With files',
            'user_ids' => [$studentUser->id],
        ])->json('data.id');

        $resource = $this->postJson("/api/meetings/{$meetingId}/resources", [
            'file' => UploadedFile::fake()->create('slides.pdf', 100, 'application/pdf'),
        ])->assertCreated()->json('data');

        Sanctum::actingAs($studentUser);
        $this->getJson("/api/meetings/{$meetingId}/resources")->assertOk();
        $this->get("/api/meetings/{$meetingId}/resources/{$resource['id']}/download")
            ->assertOk();
    }
}
