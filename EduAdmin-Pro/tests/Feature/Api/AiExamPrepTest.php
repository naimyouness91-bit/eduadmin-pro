<?php

namespace Tests\Feature\Api;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\Grade;
use App\Services\AiStudyAssistantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class AiExamPrepTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_non_student_cannot_access_ai_exam_prep(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->getJson('/api/ai-exam-prep/suggested-prompts')->assertForbidden();
    }

    public function test_student_can_chat_and_persist_messages(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Physics', 'code' => 'PHY-1']);

        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Grade::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'title' => 'Midterm',
            'score' => 45,
            'max_score' => 100,
            'type' => 'exam',
        ]);

        Sanctum::actingAs($studentUser);

        $this->getJson('/api/ai-exam-prep/suggested-prompts')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'label', 'prompt']]]);

        $conv = $this->postJson('/api/ai-exam-prep/conversations', [
            'title' => 'Physics revision',
        ])->assertCreated()
            ->json('data');

        $this->postJson("/api/ai-exam-prep/conversations/{$conv['id']}/messages", [
            'content' => 'What are my weak subjects?',
            'prompt_type' => 'weak_subjects',
        ])
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'user_message' => ['id', 'content', 'role'],
                    'assistant_message' => ['id', 'content', 'role'],
                ],
            ]);

        $this->assertDatabaseCount('ai_messages', 2);
        $assistant = AiMessage::where('role', 'assistant')->first();
        $this->assertStringContainsString('Weak', $assistant->content);

        $this->getJson('/api/ai-exam-prep/conversations?search=Physics')
            ->assertOk()
            ->assertJsonPath('data.0.id', $conv['id']);

        $this->getJson('/api/ai-exam-prep/weak-subjects')
            ->assertOk()
            ->assertJsonPath('data.0.course', 'Physics');
    }

    public function test_student_cannot_access_another_students_conversation(): void
    {
        [$studentA] = $this->createStudentUser();
        [, $studentB] = $this->createStudentUser();
        $studentBUser = $studentB->user;

        $conversation = AiConversation::create([
            'student_id' => $studentB->id,
            'user_id' => $studentBUser->id,
            'title' => 'Private',
        ]);

        Sanctum::actingAs($studentA);

        $this->getJson("/api/ai-exam-prep/conversations/{$conversation->id}")
            ->assertForbidden();
    }

    public function test_student_cannot_access_study_assistant_conversation_via_exam_prep(): void
    {
        [$studentUser, $student] = $this->createStudentUser();

        $conversation = AiConversation::create([
            'student_id' => $student->id,
            'user_id' => $studentUser->id,
            'title' => 'Study chat',
            'topic' => AiStudyAssistantService::TOPIC,
        ]);

        Sanctum::actingAs($studentUser);

        $this->getJson("/api/ai-exam-prep/conversations/{$conversation->id}")
            ->assertForbidden();
    }
}
