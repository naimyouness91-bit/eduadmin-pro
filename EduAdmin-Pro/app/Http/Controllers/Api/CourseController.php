<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesCourseAccess;
use App\Models\Course;
use App\Services\CourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    use AuthorizesCourseAccess;

    public function __construct(
        protected CourseService $courseService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Course::query()->with('teacher.user')->withCount('students');

        if ($user?->isStudent() && $user->student) {
            $query->whereHas('students', fn ($q) => $q->where('students.id', $user->student->id));
        } elseif ($user?->isTeacher() && $user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user?->isParent()) {
            $parent = $user->parent()->first();
            if ($parent) {
                $childIds = $parent->students()->pluck('students.id');
                $query->whereHas('students', fn ($q) => $q->whereIn('students.id', $childIds));
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('grade_level')) {
            $query->where('grade_level', $request->query('grade_level'));
        }

        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->query('teacher_id'));
        }

        $courses = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($courses);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'unique:courses,code'],
            'description' => ['nullable', 'string'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'grade_level' => ['nullable', 'string'],
            'credits' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string'],
            'semester' => ['nullable', 'string'],
            'academic_year' => ['nullable', 'string'],
            'room' => ['nullable', 'string'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'cover_image' => ['nullable', 'string'],
        ]);

        $course = Course::create($data);

        return response()->json([
            'message' => 'Course created successfully.',
            'data' => $course->load('teacher.user'),
        ], 201);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if ($user?->isTeacher() && $user->teacher && (int) $course->teacher_id !== (int) $user->teacher->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if ($user?->isStudent() && $user->student) {
            if (! $course->students()->where('students.id', $user->student->id)->exists()) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
        }

        if ($user?->isParent()) {
            $parent = $user->parent()->first();
            if (! $parent) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
            $childIds = $parent->students()->pluck('students.id');
            if (! $course->students()->whereIn('students.id', $childIds)->exists()) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
        }

        $course->load(['teacher.user', 'schedules']);

        if ($user?->isParent() && $user->parent) {
            $childIds = $user->parent->students()->pluck('students.id');
            $course->setRelation(
                'students',
                $course->students()->whereIn('students.id', $childIds)->with('user')->get()
            );
        } else {
            $course->load('students.user');
        }

        return response()->json([
            'data' => $course,
            'enrolled_count' => $course->enrolled_count,
        ]);
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'unique:courses,code,'.$course->id],
            'description' => ['nullable', 'string'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'grade_level' => ['nullable', 'string'],
            'credits' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string'],
            'semester' => ['nullable', 'string'],
            'academic_year' => ['nullable', 'string'],
            'room' => ['nullable', 'string'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'cover_image' => ['nullable', 'string'],
        ]);

        $course->update($data);

        return response()->json([
            'message' => 'Course updated successfully.',
            'data' => $course->fresh()->load('teacher.user'),
        ]);
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return response()->json(['message' => 'Course deleted successfully.']);
    }

    public function enroll(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:students,id'],
        ]);

        $this->courseService->enrollStudents($course, $data['student_ids']);

        return response()->json([
            'message' => 'Students enrolled successfully.',
            'data' => $course->fresh()->load('students.user'),
        ]);
    }

    public function unenroll(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:students,id'],
        ]);

        $course->students()->detach($data['student_ids']);

        return response()->json([
            'message' => 'Students unenrolled successfully.',
            'data' => $course->fresh()->load('students.user'),
        ]);
    }

    public function students(Request $request, Course $course): JsonResponse
    {
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $students = $course->students()
            ->with('user')
            ->paginate(request()->integer('per_page', 15));

        return response()->json($students);
    }
}
