<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesParentChildAccess;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\User;
use App\Services\SubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssignmentController extends Controller
{
    use AuthorizesParentChildAccess;

    public function __construct(
        protected SubmissionService $submissionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->denyParentFromGlobalList(
            $user,
            'Use GET /api/parent/children/{student}/assignments for your child\'s homework.'
        )) {
            return $response;
        }

        $query = Assignment::query()
            ->with(['course', 'teacher.user'])
            ->withCount('submissions');

        $this->scopeAssignmentsQuery($query, $user);

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $assignments = $query->latest()->paginate($request->integer('per_page', 15));

        if ($user->isStudent() && $user->student) {
            $studentId = $user->student->id;
            $submissionMap = \App\Models\Submission::query()
                ->whereIn('assignment_id', collect($assignments->items())->pluck('id'))
                ->where('student_id', $studentId)
                ->get()
                ->keyBy('assignment_id');

            $assignments->getCollection()->transform(function (Assignment $assignment) use ($submissionMap) {
                $submission = $submissionMap->get($assignment->id);
                $assignment->setAttribute('my_submission', $submission);
                $assignment->setAttribute(
                    'submission_status',
                    $this->submissionService->studentDisplayStatus($assignment, $submission)
                );

                return $assignment;
            });
        }

        return response()->json($assignments);
    }

    public function show(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canViewAssignment($user, $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $assignment->load(['course', 'teacher.user'])->loadCount('submissions');

        $payload = ['data' => $assignment];

        if ($user->isStudent() && $user->student) {
            $submission = $assignment->submissions()
                ->where('student_id', $user->student->id)
                ->first();
            $assignment->setAttribute('my_submission', $submission);
            $assignment->setAttribute(
                'submission_status',
                $this->submissionService->studentDisplayStatus($assignment, $submission)
            );
        }

        if ($this->canManageAssignment($user, $assignment)) {
            $assignment->load(['submissions.student.user']);
        }

        return response()->json($payload);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'max_score' => ['nullable', 'numeric', 'min:0'],
            'type' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:draft,published'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,txt,zip,rar,png,jpg,jpeg'],
        ]);

        $course = Course::findOrFail($data['course_id']);

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $teacherId = $course->teacher_id;
        if ($user->isTeacher() && $user->teacher) {
            $teacherId = $user->teacher->id;
        }

        $assignment = Assignment::create([
            'course_id' => $course->id,
            'teacher_id' => $teacherId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'max_score' => $data['max_score'] ?? null,
            'type' => $data['type'] ?? 'homework',
            'status' => $data['status'] ?? 'published',
        ]);

        if ($request->hasFile('attachment')) {
            $this->storeAttachment($assignment, $request->file('attachment'));
        }

        return response()->json([
            'message' => 'Assignment created successfully.',
            'data' => $assignment->fresh()->load(['course', 'teacher.user']),
        ], 201);
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageAssignment($user, $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'course_id' => ['sometimes', 'exists:courses,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'max_score' => ['nullable', 'numeric', 'min:0'],
            'type' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:draft,published'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,txt,zip,rar,png,jpg,jpeg'],
            'remove_attachment' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['course_id'])) {
            $course = Course::findOrFail($data['course_id']);
            if (! $this->canManageCourse($user, $course)) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        if ($request->boolean('remove_attachment')) {
            $this->deleteAttachment($assignment);
        }

        if ($request->hasFile('attachment')) {
            $this->deleteAttachment($assignment);
            $this->storeAttachment($assignment, $request->file('attachment'));
        }

        unset($data['attachment'], $data['remove_attachment']);
        $assignment->update($data);

        return response()->json([
            'message' => 'Assignment updated successfully.',
            'data' => $assignment->fresh()->load(['course', 'teacher.user']),
        ]);
    }

    public function destroy(Request $request, Assignment $assignment): JsonResponse
    {
        if (! $this->canManageAssignment($request->user(), $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->deleteAttachment($assignment);
        $assignment->delete();

        return response()->json(['message' => 'Assignment deleted successfully.']);
    }

    public function downloadAttachment(Request $request, Assignment $assignment): StreamedResponse|JsonResponse
    {
        if (! $this->canViewAssignment($request->user(), $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! $assignment->attachment_path || ! Storage::disk('public')->exists($assignment->attachment_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $name = $assignment->attachment_name ?? basename($assignment->attachment_path);

        return Storage::disk('public')->download($assignment->attachment_path, $name);
    }

    protected function scopeAssignmentsQuery($query, User $user): void
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return;
        }

        if ($user->isTeacher() && $user->teacher) {
            $teacherId = $user->teacher->id;
            $query->where(function ($q) use ($teacherId) {
                $q->where('teacher_id', $teacherId)
                    ->orWhereHas('course', fn ($c) => $c->where('teacher_id', $teacherId));
            });

            return;
        }

        if ($user->isStudent() && $user->student) {
            $courseIds = $user->student->courses()->pluck('courses.id');
            $query->whereIn('course_id', $courseIds)
                ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'published'));

            return;
        }

        if ($user->isParent()) {
            $courseIds = $this->parentChildCourseIds($user);
            $query->whereIn('course_id', $courseIds)
                ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'published'));

            return;
        }

        $query->whereRaw('0 = 1');
    }

    protected function canViewAssignment(User $user, Assignment $assignment): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ($this->canManageAssignment($user, $assignment)) {
            return true;
        }

        if ($user->isStudent() && $user->student) {
            $enrolled = $user->student->courses()
                ->where('courses.id', $assignment->course_id)
                ->exists();

            if (! $enrolled) {
                return false;
            }

            return $assignment->status === null || $assignment->status === 'published';
        }

        if ($user->isParent()) {
            $courseIds = $this->parentChildCourseIds($user);
            if (! $courseIds->contains($assignment->course_id)) {
                return false;
            }

            return $assignment->status === null || $assignment->status === 'published';
        }

        return false;
    }

    protected function canManageAssignment(User $user, Assignment $assignment): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ($user->isTeacher() && $user->teacher) {
            $teacherId = $user->teacher->id;

            return $assignment->teacher_id === $teacherId
                || $assignment->course?->teacher_id === $teacherId;
        }

        return false;
    }

    protected function canManageCourse(User $user, Course $course): bool
    {
        if ($user->hasRole(['super_admin', 'admin'])) {
            return true;
        }

        if ($user->isTeacher() && $user->teacher) {
            return $course->teacher_id === $user->teacher->id;
        }

        return false;
    }

    protected function storeAttachment(Assignment $assignment, $file): void
    {
        $path = $file->store('assignments/'.$assignment->id, 'public');
        $assignment->update([
            'attachment_path' => $path,
            'attachment_name' => $file->getClientOriginalName(),
        ]);
    }

    protected function deleteAttachment(Assignment $assignment): void
    {
        if ($assignment->attachment_path) {
            Storage::disk('public')->delete($assignment->attachment_path);
            $assignment->update([
                'attachment_path' => null,
                'attachment_name' => null,
            ]);
        }
    }
}
