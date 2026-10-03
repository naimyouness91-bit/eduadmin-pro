<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Announcement::query()->with('creator');

        if (! $user->hasRole(['super_admin', 'admin'])) {
            $query->where('is_published', true)
                ->where(function ($q) use ($user) {
                    $q->whereNull('target_role')
                        ->orWhere('target_role', $user->role);
                });
        }

        if ($request->filled('target_role')) {
            $query->where('target_role', $request->query('target_role'));
        }

        $announcements = $query->latest('published_at')->paginate($request->integer('per_page', 15));

        return response()->json($announcements);
    }

    public function show(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin'])) {
            if (! $announcement->is_published) {
                return response()->json(['message' => 'Announcement not found.'], 404);
            }

            if (
                $announcement->target_role !== null
                && $announcement->target_role !== $user->role
            ) {
                return response()->json(['message' => 'Announcement not found.'], 404);
            }
        }

        return response()->json([
            'data' => $announcement->load('creator'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'target_role' => ['nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);

        $announcement = Announcement::create([
            ...$data,
            'created_by' => $request->user()->id,
            'published_at' => ($data['is_published'] ?? false)
                ? ($data['published_at'] ?? now())
                : null,
        ]);

        return response()->json([
            'message' => 'Announcement created successfully.',
            'data' => $announcement->load('creator'),
        ], 201);
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'string'],
            'target_role' => ['nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (array_key_exists('is_published', $data) && $data['is_published'] && ! $announcement->published_at) {
            $data['published_at'] = $data['published_at'] ?? now();
        }

        $announcement->update($data);

        return response()->json([
            'message' => 'Announcement updated successfully.',
            'data' => $announcement->fresh()->load('creator'),
        ]);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }
}
