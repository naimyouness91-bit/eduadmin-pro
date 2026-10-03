<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Services\ActivityLogService;
use App\Services\AuthService;
use App\Services\TeacherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function __construct(
        protected TeacherService $teacherService,
        protected AuthService $authService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Teacher::query()->with('user');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('teacher_id', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('department')) {
            $query->where('department', $request->query('department'));
        }

        if ($request->filled('employment_type')) {
            $query->where('employment_type', $request->query('employment_type'));
        }

        $teachers = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($teachers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'teacher_id' => ['nullable', 'string', 'unique:teachers,teacher_id'],
            'specialization' => ['nullable', 'string'],
            'department' => ['nullable', 'string'],
            'qualification' => ['nullable', 'string'],
            'experience_years' => ['nullable', 'integer', 'min:0'],
            'employment_type' => ['nullable', 'string'],
            'joining_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'numeric'],
            'bio' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
        ]);

        $teacher = $this->teacherService->createTeacher($data);

        return response()->json([
            'message' => 'Teacher created successfully.',
            'data' => $teacher,
        ], 201);
    }

    public function show(Teacher $teacher): JsonResponse
    {
        $teacher->load([
            'user',
            'courses' => fn ($q) => $q->withCount('students'),
        ]);

        return response()->json(['data' => $teacher]);
    }

    public function update(Request $request, Teacher $teacher): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$teacher->user_id],
            'password' => ['sometimes', 'string', 'min:8'],
            'teacher_id' => ['sometimes', 'string', 'unique:teachers,teacher_id,'.$teacher->id],
            'specialization' => ['nullable', 'string'],
            'department' => ['nullable', 'string'],
            'qualification' => ['nullable', 'string'],
            'experience_years' => ['nullable', 'integer', 'min:0'],
            'employment_type' => ['nullable', 'string'],
            'joining_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'numeric'],
            'bio' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $teacher = $this->teacherService->updateTeacher($teacher, $data);

        return response()->json([
            'message' => 'Teacher updated successfully.',
            'data' => $teacher,
        ]);
    }

    public function destroy(Request $request, Teacher $teacher): JsonResponse
    {
        $actor = $request->user();
        $teacherId = $teacher->teacher_id;

        $this->authService->logActivity(
            $actor ?? $teacher->user,
            ActivityLogService::ACTION_TEACHER_DELETED,
            "Teacher deleted ({$teacherId}).",
            [
                'model_type' => Teacher::class,
                'model_id' => $teacher->id,
                'old_values' => $teacher->load('user')->toArray(),
            ]
        );

        $teacher->user?->delete();
        $teacher->delete();

        return response()->json(['message' => 'Teacher deleted successfully.']);
    }

    public function courses(Request $request, Teacher $teacher): JsonResponse
    {
        $user = $request->user();

        if ($user->isTeacher() && (int) $user->teacher?->id !== (int) $teacher->id && ! $user->hasRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if (! $user->hasRole(['super_admin', 'admin', 'teacher'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $courses = $teacher->courses()
            ->withCount('students')
            ->paginate(request()->integer('per_page', 15));

        return response()->json($courses);
    }
}
