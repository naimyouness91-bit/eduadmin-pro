<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesCourseAccess;
use App\Http\Controllers\Concerns\AuthorizesParentChildAccess;
use App\Models\Course;
use App\Models\Grade;
use App\Services\ActivityLogService;
use App\Services\AuthService;
use App\Services\GradeService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    use AuthorizesCourseAccess;
    use AuthorizesParentChildAccess;

    public function __construct(
        protected GradeService $gradeService,
        protected NotificationService $notificationService,
        protected AuthService $authService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->denyParentFromGlobalList(
            $user,
            'Use GET /api/parent/children/{student}/grades for your child\'s grades.'
        )) {
            return $response;
        }

        if ($user?->hasRole(['super_admin', 'admin']) && ! Grade::query()->exists()) {
            $this->gradeService->seedDemoGradesIfEmpty();
        }

        $query = $this->gradeService
            ->applyGradeFilters($this->gradeService->scopedGradeQuery($user), $request)
            ->with(['student.user', 'course', 'teacher.user']);

        $grades = $query->latest('graded_at')->latest('id')->paginate($request->integer('per_page', 15));

        return response()->json($grades);
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->denyParentFromGlobalList(
            $user,
            'Use GET /api/parent/children/{student}/grades for your child\'s grades.'
        )) {
            return $response;
        }

        return response()->json(
            $this->gradeService->gradeStats($request->user(), $request)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'course_id' => ['required', 'exists:courses,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'type' => ['nullable', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'score' => ['required', 'numeric'],
            'max_score' => ['nullable', 'numeric'],
            'weight' => ['nullable', 'numeric'],
            'graded_at' => ['nullable', 'date'],
            'semester' => ['nullable', 'string'],
            'academic_year' => ['nullable', 'string'],
            'feedback' => ['nullable', 'string'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $enrolled = $course->students()->where('students.id', $data['student_id'])->exists();
        if (! $enrolled) {
            return response()->json(['message' => 'Student is not enrolled in this course.'], 422);
        }

        $grade = Grade::create($data);
        $grade->load(['student.user', 'course', 'teacher.user']);

        $this->authService->logActivity(
            $request->user(),
            ActivityLogService::ACTION_GRADE_ADDED,
            "Grade added for {$grade->student?->user?->name}: {$grade->title} ({$grade->score}/{$grade->max_score}).",
            [
                'model_type' => Grade::class,
                'model_id' => $grade->id,
                'new_values' => [
                    'student_id' => $grade->student_id,
                    'course_id' => $grade->course_id,
                    'title' => $grade->title,
                    'score' => $grade->score,
                ],
            ]
        );

        $this->notificationService->notifyGradePosted($grade);

        return response()->json([
            'message' => 'Grade created successfully.',
            'data' => $grade,
        ], 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'grades' => ['required', 'array', 'min:1'],
            'grades.*.student_id' => ['required', 'exists:students,id'],
            'grades.*.score' => ['required', 'numeric'],
            'grades.*.title' => ['sometimes', 'string'],
            'grades.*.type' => ['sometimes', 'string'],
            'grades.*.max_score' => ['sometimes', 'numeric'],
            'grades.*.weight' => ['sometimes', 'numeric'],
            'meta' => ['sometimes', 'array'],
            'meta.teacher_id' => ['nullable', 'exists:teachers,id'],
            'meta.type' => ['nullable', 'string'],
            'meta.title' => ['nullable', 'string'],
            'meta.max_score' => ['nullable', 'numeric'],
            'meta.weight' => ['nullable', 'numeric'],
            'meta.semester' => ['nullable', 'string'],
            'meta.academic_year' => ['nullable', 'string'],
            'meta.graded_at' => ['nullable', 'date'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $created = $this->gradeService->bulkGrade(
            $data['course_id'],
            $data['grades'],
            $data['meta'] ?? []
        );

        foreach ($created as $grade) {
            $this->notificationService->notifyGradePosted(
                $grade->load(['student.user', 'student.parents.user', 'course'])
            );
        }

        if ($request->user()) {
            $this->authService->logActivity(
                $request->user(),
                ActivityLogService::ACTION_GRADE_ADDED,
                'Bulk grades recorded for course #'.$data['course_id'].'.',
                [
                    'model_type' => Grade::class,
                    'new_values' => [
                        'course_id' => $data['course_id'],
                        'count' => count($data['grades']),
                    ],
                ]
            );
        }

        return response()->json(['message' => 'Grades recorded successfully.'], 201);
    }

    public function update(Request $request, Grade $grade): JsonResponse
    {
        if ($response = $this->denyUnlessCanManageGrade($request->user(), $grade)) {
            return $response;
        }

        $data = $request->validate([
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'type' => ['nullable', 'string'],
            'title' => ['sometimes', 'string', 'max:255'],
            'score' => ['sometimes', 'numeric'],
            'max_score' => ['nullable', 'numeric'],
            'weight' => ['nullable', 'numeric'],
            'graded_at' => ['nullable', 'date'],
            'semester' => ['nullable', 'string'],
            'academic_year' => ['nullable', 'string'],
            'feedback' => ['nullable', 'string'],
        ]);

        $grade->update($data);

        return response()->json([
            'message' => 'Grade updated successfully.',
            'data' => $grade->fresh()->load(['student.user', 'course', 'teacher.user']),
        ]);
    }

    public function destroy(Grade $grade): JsonResponse
    {
        if ($response = $this->denyUnlessCanManageGrade(request()->user(), $grade)) {
            return $response;
        }

        $grade->delete();

        return response()->json(['message' => 'Grade deleted successfully.']);
    }

    public function courseReport(Request $request, Course $course): JsonResponse
    {
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $report = $this->gradeService->getCourseReport(
            $course,
            $request->query('semester'),
            $request->query('academic_year')
        );

        return response()->json($report);
    }
}
