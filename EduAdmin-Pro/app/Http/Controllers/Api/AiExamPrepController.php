<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\User;
use App\Services\AiExamPrepService;
use App\Services\AiStudyAssistantService;
use App\Services\StudentExamContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AiExamPrepController extends Controller
{
    public function __construct(
        protected AiExamPrepService $aiService,
        protected StudentExamContextService $contextService
    ) {}

    public function suggestedPrompts(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        return response()->json([
            'data' => $this->aiService->suggestedPrompts($student),
            'ai_enabled' => (bool) config('services.openai.api_key'),
        ]);
    }

    public function weakSubjects(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        return response()->json([
            'data' => $this->contextService->weakSubjects($student),
            'context' => $this->contextService->buildContext($student),
        ]);
    }

    public function indexConversations(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $query = AiConversation::query()
            ->where('student_id', $student->id)
            ->where(function ($q) {
                $q->whereNull('topic')
                    ->orWhere('topic', '!=', AiStudyAssistantService::TOPIC);
            })
            ->withCount('messages')
            ->latest('updated_at');

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('topic', 'like', "%{$search}%")
                    ->orWhereHas('messages', fn ($mq) => $mq->where('content', 'like', "%{$search}%"));
            });
        }

        $conversations = $query->paginate($request->integer('per_page', 20));

        return response()->json($conversations);
    }

    public function storeConversation(Request $request): JsonResponse
    {
        $student = $this->requireStudent($request->user());

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'topic' => ['nullable', 'string', 'max:255'],
        ]);

        $conversation = AiConversation::create([
            'student_id' => $student->id,
            'user_id' => $request->user()->id,
            'title' => $data['title'] ?? 'New study session',
            'topic' => AiExamPrepService::TOPIC,
        ]);

        return response()->json([
            'message' => 'Conversation created.',
            'data' => $conversation,
        ], 201);
    }

    public function showConversation(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request->user(), $conversation);

        $conversation->load(['messages' => fn ($q) => $q->orderBy('created_at')]);

        return response()->json(['data' => $conversation]);
    }

    public function destroyConversation(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request->user(), $conversation);
        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted.']);
    }

    public function sendMessage(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request->user(), $conversation);

        $data = $request->validate([
            'content' => ['required', 'string', 'max:8000'],
            'prompt_type' => ['nullable', 'string', 'max:50'],
        ]);

        $student = $this->requireStudent($request->user());

        $userMessage = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $data['content'],
            'prompt_type' => $data['prompt_type'] ?? null,
        ]);

        if ($conversation->messages()->count() === 1) {
            $conversation->update([
                'title' => Str::limit($data['content'], 60),
            ]);
        }

        $conversation->touch();

        $conversation->load('messages');

        $assistantContent = $this->aiService->generateReply(
            $student,
            $conversation,
            $data['content'],
            $data['prompt_type'] ?? null
        );

        $assistantMessage = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $assistantContent,
            'prompt_type' => $data['prompt_type'] ?? null,
            'metadata' => [
                'ai_provider' => config('services.openai.api_key') ? 'openai' : 'local',
            ],
        ]);

        return response()->json([
            'data' => [
                'user_message' => $userMessage,
                'assistant_message' => $assistantMessage,
            ],
        ]);
    }

    protected function requireStudent(User $user)
    {
        if (! $user->isStudent() || ! $user->student) {
            abort(403, 'AI Exam Preparation is available to students only.');
        }

        return $user->student;
    }

    protected function authorizeConversation(User $user, AiConversation $conversation): void
    {
        if (
            ! $user->isStudent()
            || ! $user->student
            || $conversation->student_id !== $user->student->id
            || $conversation->topic === AiStudyAssistantService::TOPIC
        ) {
            abort(403, 'Forbidden.');
        }
    }
}
