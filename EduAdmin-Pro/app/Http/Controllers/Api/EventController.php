<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    public const TYPES = ['exam', 'meeting', 'holiday', 'event'];

    public const TYPE_COLORS = [
        'exam' => '#ef4444',
        'meeting' => '#6366f1',
        'holiday' => '#22c55e',
        'event' => '#f59e0b',
    ];

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()->with('creator:id,name');

        if ($request->filled('from')) {
            $query->where('end_date', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->where('start_date', '<=', $request->query('to'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            $query->where('is_public', true);
        }

        $events = $query->orderBy('start_date')->paginate($request->integer('per_page', 50));

        return response()->json($events);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'color' => ['nullable', 'string', 'max:20'],
            'type' => ['nullable', 'string', Rule::in(self::TYPES)],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        $type = $data['type'] ?? 'event';

        $event = Event::create([
            ...$data,
            'color' => $data['color'] ?? self::TYPE_COLORS[$type] ?? '#6366f1',
            'type' => $type,
            'is_public' => $data['is_public'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        $this->notificationService->broadcastEventCreated($event);

        return response()->json([
            'message' => 'Event created successfully.',
            'data' => $event->load('creator:id,name'),
        ], 201);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'color' => ['nullable', 'string', 'max:20'],
            'type' => ['sometimes', 'string', Rule::in(self::TYPES)],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['type']) && ! isset($data['color'])) {
            $data['color'] = self::TYPE_COLORS[$data['type']] ?? $event->color;
        }

        $event->update($data);

        return response()->json([
            'message' => 'Event updated successfully.',
            'data' => $event->fresh()->load('creator:id,name'),
        ]);
    }

    public function destroy(Event $event): JsonResponse
    {
        $event->delete();

        return response()->json(['message' => 'Event deleted successfully.']);
    }
}
