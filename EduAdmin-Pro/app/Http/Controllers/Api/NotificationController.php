<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->notifications()->latest();

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        if ($request->filled('category')) {
            $category = $request->query('category');
            $allowed = [
                NotificationService::CATEGORY_ATTENDANCE,
                NotificationService::CATEGORY_GRADE,
                NotificationService::CATEGORY_MESSAGE,
                NotificationService::CATEGORY_EVENT,
                NotificationService::CATEGORY_SYSTEM,
                NotificationService::CATEGORY_TIMETABLE,
            ];

            if (in_array($category, $allowed, true)) {
                $query->where('data->category', $category);
            }
        }

        $notifications = $query->paginate($request->integer('per_page', 15));

        $notifications->getCollection()->transform(
            fn (DatabaseNotification $notification) => $this->formatNotification($notification)
        );

        return response()->json($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read.',
            'data' => $this->formatNotification($notification->fresh()),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'message' => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatNotification(DatabaseNotification $notification): array
    {
        $data = $notification->data ?? [];
        $category = $data['category'] ?? NotificationService::CATEGORY_SYSTEM;

        return [
            'id' => $notification->id,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
            'category' => $category,
            'category_label' => $this->categoryLabel($category),
            'title' => $data['title'] ?? 'Notification',
            'body' => $data['body'] ?? '',
            'meta' => $data['meta'] ?? [],
            'data' => $data,
        ];
    }

    protected function categoryLabel(string $category): string
    {
        return match ($category) {
            NotificationService::CATEGORY_ATTENDANCE => 'High absence rate',
            NotificationService::CATEGORY_GRADE => 'New grade',
            NotificationService::CATEGORY_MESSAGE => 'New message',
            NotificationService::CATEGORY_EVENT => 'New event',
            NotificationService::CATEGORY_SYSTEM => 'System alert',
            NotificationService::CATEGORY_TIMETABLE => 'Timetable',
            default => 'Notification',
        };
    }
}
