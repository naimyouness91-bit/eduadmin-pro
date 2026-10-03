<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Schedule::query()->with(['course', 'teacher.user']);

        if ($user->isTeacher() && $user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user->isStudent() && $user->student) {
            $courseIds = $user->student->courses()->pluck('courses.id');
            if ($courseIds->isEmpty()) {
                return response()->json(['data' => []]);
            }
            $query->whereIn('course_id', $courseIds);
        } elseif ($user->isParent() && $user->parent) {
            $courseIds = $user->parent->students()
                ->with('courses')
                ->get()
                ->flatMap(fn ($s) => $s->courses->pluck('id'))
                ->unique()
                ->values();
            if ($courseIds->isEmpty()) {
                return response()->json(['data' => []]);
            }
            $query->whereIn('course_id', $courseIds);
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->query('course_id'));
        }

        if ($request->filled('day_of_week')) {
            $query->where('day_of_week', $request->query('day_of_week'));
        }

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        $schedules = $query->orderBy('day_of_week')->orderBy('start_time')->get();

        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge($this->normalizeTimeFields($request->only(['start_time', 'end_time'])));

        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string'],
            'semester' => ['nullable', 'string'],
            'academic_year' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $schedule = Schedule::create($data);

        return response()->json([
            'message' => 'Schedule created successfully.',
            'data' => $schedule->load(['course', 'teacher.user']),
        ], 201);
    }

    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $request->merge($this->normalizeTimeFields($request->only(['start_time', 'end_time'])));

        $data = $request->validate([
            'course_id' => ['sometimes', 'exists:courses,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'day_of_week' => ['sometimes', 'integer', 'between:1,7'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string'],
            'semester' => ['nullable', 'string'],
            'academic_year' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $schedule->update($data);

        return response()->json([
            'message' => 'Schedule updated successfully.',
            'data' => $schedule->fresh(['course', 'teacher.user']),
        ]);
    }

    public function destroy(Schedule $schedule): JsonResponse
    {
        $schedule->delete();

        return response()->json(['message' => 'Schedule deleted successfully.']);
    }

    /**
     * Accept HH:mm or HH:mm:ss from clients; API validation expects H:i (HH:mm).
     *
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    protected function normalizeTimeFields(array $fields): array
    {
        foreach (['start_time', 'end_time'] as $key) {
            if (! isset($fields[$key]) || $fields[$key] === null || $fields[$key] === '') {
                continue;
            }
            $fields[$key] = substr((string) $fields[$key], 0, 5);
        }

        return $fields;
    }
}
