<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\User;
use App\Services\AiStudyAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiStudyAssistantController extends Controller
{
    public function __construct(
        protected AiStudyAssistantService $studyAssistant
    ) {}

    public function suggestedPrompts(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        return response()->json([
            'data' => $this->studyAssistant->suggestedPrompts($student),
            'ai_enabled' => (bool) config('services.openai.api_key'),
            'educational_mode' => true,
        ]);
    }

    public function indexConversations(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $conversations = AiConversation::query()
            ->where('student_id', $student->id)
            ->where('topic', AiStudyAssistantService::TOPIC)
            ->withCount('messages')
            ->latest('updated_at')
            ->paginate($request->integer('per_page', 30));

        return response()->json($conversations);
    }

    public function showConversation(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request->user(), $conversation);

        $conversation->load(['messages' => fn ($q) => $q->orderBy('created_at')]);

        return response()->json(['data' => $conversation]);
    }

    public function chat(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $data = $request->validate([
            'message' => ['required', 'string', 'max:8000'],
            'conversation_id' => ['nullable', 'integer', 'exists:ai_conversations,id'],
            'prompt_type' => ['nullable', 'string', 'max:50'],
        ]);

        $result = $this->studyAssistant->chat(
            $student,
            $request->user(),
            $data['message'],
            $data['conversation_id'] ?? null,
            $data['prompt_type'] ?? null
        );

        $topicAllowed = (bool) ($result['assistant_message']->metadata['topic_allowed'] ?? true);

        return response()->json([
            'data' => [
                'conversation_id' => $result['conversation']->id,
                'user_message' => $result['user_message'],
                'assistant_message' => $result['assistant_message'],
                'messages' => $result['messages'],
            ],
            'ai_enabled' => (bool) config('services.openai.api_key'),
            'educational_mode' => true,
            'topic_allowed' => $topicAllowed,
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $data = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'subject' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $payload = $this->studyAssistant->summary(
                $student,
                $request->user(),
                $data['topic'],
                $data['subject'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'educational_mode' => true], 422);
        }

        return response()->json(['data' => $payload, 'educational_mode' => true]);
    }

    public function quiz(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $data = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'count' => ['sometimes', 'integer', 'min:3', 'max:15'],
        ]);

        try {
            $payload = $this->studyAssistant->quiz(
                $student,
                $request->user(),
                $data['topic'],
                $data['count'] ?? 5
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'educational_mode' => true], 422);
        }

        return response()->json(['data' => $payload, 'educational_mode' => true]);
    }

    public function studyPlan(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $data = $request->validate([
            'subject' => ['nullable', 'string', 'max:255'],
            'days' => ['sometimes', 'integer', 'min:3', 'max:14'],
        ]);

        try {
            $payload = $this->studyAssistant->studyPlan(
                $student,
                $request->user(),
                $data['subject'] ?? null,
                $data['days'] ?? 7
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'educational_mode' => true], 422);
        }

        return response()->json(['data' => $payload, 'educational_mode' => true]);
    }

    protected function requireStudent(User $user)
    {
        if (! $user->isStudent() || ! $user->student) {
            abort(403, 'AI Study Assistant is available to students only.');
        }

        return $user->student;
    }

    protected function authorizeConversation(User $user, AiConversation $conversation): void
    {
        if (
            ! $user->isStudent()
            || ! $user->student
            || $conversation->student_id !== $user->student->id
            || $conversation->topic !== AiStudyAssistantService::TOPIC
        ) {
            abort(403, 'Forbidden.');
        }
    }
}
