<?php

namespace App\Services;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

class AiStudyAssistantService
{
    public const TOPIC = 'study_assistant';

    public function __construct(
        protected AiExamPrepService $aiService,
        protected StudentExamContextService $contextService,
        protected AiEducationalModeValidator $educationalValidator
    ) {}

    /**
     * @return array<int, array<string, string>>
     */
    public function suggestedPrompts(Student $student): array
    {
        $courses = $student->courses()->pluck('name')->take(3)->all();
        $sample = $courses[0] ?? 'your course';

        return [
            [
                'id' => 'explain',
                'label' => 'Explain Laravel Middleware',
                'prompt' => 'Explain Laravel Middleware in simple steps with a real example.',
            ],
            [
                'id' => 'quiz',
                'label' => 'Database quiz (10 questions)',
                'prompt' => 'Generate 10 database practice questions with an answer key.',
            ],
            [
                'id' => 'exam_prep',
                'label' => 'Math exam in 5 days',
                'prompt' => 'Prepare me for my math exam in 5 days with a daily study plan.',
            ],
            [
                'id' => 'summary',
                'label' => 'Summarize SQL joins',
                'prompt' => 'Summarize SQL JOIN types with clear examples for each.',
            ],
            [
                'id' => 'study_plan',
                'label' => '7-day study plan',
                'prompt' => "Build a 7-day study plan for: {$sample}",
            ],
            [
                'id' => 'concept',
                'label' => 'Difficult concept',
                'prompt' => 'Explain a difficult concept from my recent lessons using an analogy.',
            ],
            [
                'id' => 'resources',
                'label' => 'Learning resources',
                'prompt' => 'Recommend learning resources and practice techniques for my weakest subject.',
            ],
            [
                'id' => 'homework',
                'label' => 'Homework help',
                'prompt' => 'Help me understand this homework problem step by step (show reasoning, not just the answer).',
            ],
        ];
    }

    /**
     * @return array{conversation: AiConversation, user_message: AiMessage, assistant_message: AiMessage, messages: \Illuminate\Support\Collection}
     */
    public function chat(
        Student $student,
        User $user,
        string $message,
        ?int $conversationId = null,
        ?string $promptType = null
    ): array {
        $conversation = $this->resolveConversation($student, $user, $conversationId, $message);

        $userMessage = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $message,
            'prompt_type' => $promptType,
        ]);

        if ($conversation->messages()->count() === 1) {
            $conversation->update(['title' => Str::limit($message, 60)]);
        }

        $conversation->touch();
        $conversation->load('messages');

        $educationalAllowed = $this->educationalValidator->allows(
            $message,
            $promptType,
            $conversation
        );

        if ($educationalAllowed) {
            $assistantContent = $this->aiService->generateReply(
                $student,
                $conversation,
                $message,
                $promptType,
                educationalMode: true
            );
        } else {
            $assistantContent = $this->educationalValidator->rejectionMessage();
        }

        $assistantMessage = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $assistantContent,
            'prompt_type' => $promptType,
            'metadata' => [
                'ai_provider' => $educationalAllowed
                    ? (config('services.openai.api_key') ? 'openai' : 'local')
                    : 'educational_filter',
                'module' => self::TOPIC,
                'educational_mode' => true,
                'topic_allowed' => $educationalAllowed,
            ],
        ]);

        $conversation->load(['messages' => fn ($q) => $q->orderBy('created_at')]);

        return [
            'conversation' => $conversation,
            'user_message' => $userMessage,
            'assistant_message' => $assistantMessage,
            'messages' => $conversation->messages,
        ];
    }

    /**
     * @return array{content: string, conversation_id: int|null, type: string}
     */
    public function summary(Student $student, User $user, string $topic, ?string $subject = null): array
    {
        $this->assertEducationalTopic($topic, $subject);

        $label = $subject ? "{$topic} ({$subject})" : $topic;
        $message = "Create a structured lesson summary with key points and definitions for: {$label}";

        $result = $this->chat($student, $user, $message, null, AiExamPrepService::PROMPT_SUMMARY);

        return [
            'type' => 'summary',
            'topic' => $topic,
            'subject' => $subject,
            'content' => $result['assistant_message']->content,
            'conversation_id' => $result['conversation']->id,
        ];
    }

    /**
     * @return array{content: string, conversation_id: int|null, type: string}
     */
    public function quiz(Student $student, User $user, string $topic, int $count = 5): array
    {
        $this->assertEducationalTopic($topic);

        $count = max(3, min(15, $count));
        $message = "Generate a {$count}-question practice quiz with an answer key for: {$topic}";

        $result = $this->chat($student, $user, $message, null, AiExamPrepService::PROMPT_QUIZ);

        return [
            'type' => 'quiz',
            'topic' => $topic,
            'question_count' => $count,
            'content' => $result['assistant_message']->content,
            'conversation_id' => $result['conversation']->id,
        ];
    }

    /**
     * @return array{content: string, conversation_id: int|null, type: string}
     */
    public function studyPlan(
        Student $student,
        User $user,
        ?string $subject = null,
        int $days = 7
    ): array {
        if ($subject) {
            $this->assertEducationalTopic($subject);
        }

        $days = max(3, min(14, $days));
        $focus = $subject ?: 'my enrolled courses and weak subjects';
        $message = "Build a {$days}-day study plan for: {$focus}. Include daily focus, tasks, and quick checks.";

        $result = $this->chat($student, $user, $message, null, AiExamPrepService::PROMPT_REVISION);

        return [
            'type' => 'study_plan',
            'subject' => $subject,
            'days' => $days,
            'content' => $result['assistant_message']->content,
            'conversation_id' => $result['conversation']->id,
        ];
    }

    protected function assertEducationalTopic(string $topic, ?string $subject = null): void
    {
        $combined = trim($topic.' '.($subject ?? ''));

        if (! $this->educationalValidator->allowsTopic($combined)) {
            throw new \InvalidArgumentException(AiEducationalModeValidator::REJECTION_MESSAGE);
        }
    }

    protected function resolveConversation(
        Student $student,
        User $user,
        ?int $conversationId,
        string $firstMessage
    ): AiConversation {
        if ($conversationId) {
            $conversation = AiConversation::query()
                ->where('id', $conversationId)
                ->where('student_id', $student->id)
                ->where('topic', self::TOPIC)
                ->first();

            if ($conversation) {
                return $conversation;
            }
        }

        return AiConversation::create([
            'student_id' => $student->id,
            'user_id' => $user->id,
            'title' => Str::limit($firstMessage, 60) ?: 'Study session',
            'topic' => self::TOPIC,
        ]);
    }
}
