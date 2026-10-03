<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}
    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $messages = Message::query()
            ->where(fn ($q) => $q->where('sender_id', $userId)->orWhere('receiver_id', $userId))
            ->with(['sender', 'receiver'])
            ->latest()
            ->get();

        $conversations = $messages
            ->groupBy(function (Message $message) use ($userId) {
                return $message->sender_id === $userId
                    ? $message->receiver_id
                    : $message->sender_id;
            })
            ->map(function ($thread, $otherUserId) use ($userId) {
                $latest = $thread->first();
                $otherUser = $latest->sender_id === $userId
                    ? $latest->receiver
                    : $latest->sender;

                return [
                    'user' => $otherUser,
                    'last_message' => $latest,
                    'unread_count' => $thread
                        ->where('receiver_id', $userId)
                        ->where('is_read', false)
                        ->count(),
                ];
            })
            ->values()
            ->sortByDesc(fn ($c) => $c['last_message']->created_at)
            ->values();

        return response()->json(['data' => $conversations]);
    }

    public function messages(Request $request, User $user): JsonResponse
    {
        $authId = $request->user()->id;

        Message::query()
            ->where('sender_id', $user->id)
            ->where('receiver_id', $authId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        $messages = Message::query()
            ->where(function ($q) use ($authId, $user) {
                $q->where(function ($q2) use ($authId, $user) {
                    $q2->where('sender_id', $authId)->where('receiver_id', $user->id);
                })->orWhere(function ($q2) use ($authId, $user) {
                    $q2->where('sender_id', $user->id)->where('receiver_id', $authId);
                });
            })
            ->with(['sender', 'receiver'])
            ->orderBy('created_at')
            ->paginate($request->integer('per_page', 30));

        return response()->json($messages);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'receiver_id' => ['required', 'exists:users,id'],
            'content' => ['required', 'string'],
            'type' => ['nullable', 'string', 'in:text,file,image'],
        ]);

        $message = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $data['receiver_id'],
            'content' => $data['content'],
            'type' => $data['type'] ?? 'text',
            'file_path' => null,
            'is_read' => false,
        ]);

        $receiver = User::find($data['receiver_id']);
        if ($receiver) {
            $this->notificationService->notifyNewMessage(
                $receiver,
                $request->user(),
                \Illuminate\Support\Str::limit($data['content'], 80)
            );
        }

        return response()->json([
            'message' => 'Message sent.',
            'data' => $message->load(['sender', 'receiver']),
        ], 201);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Message::where('receiver_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread_count' => $count]);
    }
}
