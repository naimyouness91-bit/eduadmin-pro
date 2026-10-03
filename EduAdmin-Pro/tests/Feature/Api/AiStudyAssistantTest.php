<?php

namespace Tests\Feature\Api;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Services\AiEducationalModeValidator;
use App\Services\AiStudyAssistantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class AiStudyAssistantTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_non_student_cannot_access_ai_study_assistant(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->postJson('/api/ai/chat', ['message' => 'Hello'])->assertForbidden();
    }

    public function test_student_can_chat_and_persist_messages(): void
    {
        [$studentUser] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        $this->postJson('/api/ai/chat', [
            'message' => 'Explain Laravel Middleware',
        ])
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'conversation_id',
                    'user_message' => ['content', 'role'],
                    'assistant_message' => ['content', 'role'],
                    'messages',
                ],
            ]);

        $this->assertDatabaseCount('ai_messages', 2);

        $conversation = AiConversation::first();
        $this->assertSame(AiStudyAssistantService::TOPIC, $conversation->topic);

        $this->postJson('/api/ai/chat', [
            'message' => 'Give me an example',
            'conversation_id' => $conversation->id,
        ])->assertOk();

        $this->assertDatabaseCount('ai_messages', 4);
    }

    public function test_student_can_generate_summary_quiz_and_study_plan(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        [, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Database', 'code' => 'DB-1']);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($studentUser);

        $this->postJson('/api/ai/summary', ['topic' => 'Normalization'])
            ->assertOk()
            ->assertJsonPath('data.type', 'summary')
            ->assertJsonStructure(['data' => ['content', 'conversation_id']]);

        $quiz = $this->postJson('/api/ai/quiz', ['topic' => 'SQL JOINs', 'count' => 5])
            ->assertOk()
            ->assertJsonPath('data.type', 'quiz');
        $this->assertStringContainsString('Quiz', $quiz->json('data.content'));

        $plan = $this->postJson('/api/ai/study-plan', ['subject' => 'Database exam', 'days' => 7])
            ->assertOk()
            ->assertJsonPath('data.type', 'study_plan');
        $this->assertStringContainsString('Day', $plan->json('data.content'));
    }

    public function test_conversations_list_is_scoped_to_study_assistant(): void
    {
        [$studentUser, $student] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        AiConversation::create([
            'student_id' => $student->id,
            'user_id' => $studentUser->id,
            'title' => 'Exam prep chat',
            'topic' => null,
        ]);

        $study = AiConversation::create([
            'student_id' => $student->id,
            'user_id' => $studentUser->id,
            'title' => 'Study chat',
            'topic' => AiStudyAssistantService::TOPIC,
        ]);

        AiMessage::create([
            'ai_conversation_id' => $study->id,
            'role' => 'user',
            'content' => 'Hi',
        ]);

        $this->getJson('/api/ai/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_student_cannot_access_another_students_study_conversation(): void
    {
        [$studentA] = $this->createStudentUser();
        [, $studentB] = $this->createStudentUser();

        $conversation = AiConversation::create([
            'student_id' => $studentB->id,
            'user_id' => $studentB->user->id,
            'title' => 'Private',
            'topic' => AiStudyAssistantService::TOPIC,
        ]);

        Sanctum::actingAs($studentA);

        $this->getJson("/api/ai/conversations/{$conversation->id}")->assertForbidden();
    }

    public function test_educational_prompts_include_educational_mode_flag(): void
    {
        [$studentUser] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/ai/suggested-prompts')
            ->assertOk()
            ->assertJsonPath('educational_mode', true)
            ->assertJsonStructure(['data' => [['id', 'label', 'prompt']]]);
    }

    public function test_educational_question_is_answered(): void
    {
        [$studentUser] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        $response = $this->postJson('/api/ai/chat', [
            'message' => 'Explain Laravel Middleware',
        ])->assertOk()
            ->assertJsonPath('educational_mode', true)
            ->assertJsonPath('topic_allowed', true);

        $content = $response->json('data.assistant_message.content');
        $this->assertNotSame(AiEducationalModeValidator::REJECTION_MESSAGE, $content);
        $this->assertNotEmpty($content);
    }

    public function test_non_educational_question_is_rejected(): void
    {
        [$studentUser] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        $this->postJson('/api/ai/chat', [
            'message' => "Who will win tomorrow's football match?",
        ])
            ->assertOk()
            ->assertJsonPath('topic_allowed', false)
            ->assertJsonPath('data.assistant_message.content', AiEducationalModeValidator::REJECTION_MESSAGE);
    }

    public function test_non_educational_summary_topic_returns_422(): void
    {
        [$studentUser] = $this->createStudentUser();
        Sanctum::actingAs($studentUser);

        $this->postJson('/api/ai/summary', ['topic' => 'Who will win the election'])
            ->assertStatus(422)
            ->assertJsonPath('message', AiEducationalModeValidator::REJECTION_MESSAGE);
    }
}
