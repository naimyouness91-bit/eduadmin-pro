<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Submission;
use App\Models\User;
use App\Services\SubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubmissionController extends Controller
{
    public function __construct(
        protected SubmissionService $submissionService
    ) {}

    public function index(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageAssignment($user, $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $submissions = $assignment->submissions()
            ->with(['student.user'])
            ->latest('submitted_at')
            ->paginate($request->integer('per_page', 50));

        return response()->json($submissions);
    }

    public function store(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();

        if (! $user->isStudent() || ! $user->student) {
            return response()->json(['message' => 'Only students can submit assignments.'], 403);
        }

        if (! $this->canStudentSubmit($user, $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'content' => ['nullable', 'string'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,txt,zip,rar,png,jpg,jpeg'],
        ]);

        if (empty($data['content']) && ! $request->hasFile('file')) {
            return response()->json([
                'message' => 'Provide submission text or upload a file.',
            ], 422);
        }

        $studentId = $user->student->id;
        $submission = Submission::firstOrNew([
            'assignment_id' => $assignment->id,
            'student_id' => $studentId,
        ]);

        if ($submission->exists && $submission->status === SubmissionService::STATUS_REVIEWED) {
            return response()->json([
                'message' => 'This submission has already been reviewed and cannot be changed.',
            ], 422);
        }

        if ($request->hasFile('file')) {
            if ($submission->file_path) {
                Storage::disk('public')->delete($submission->file_path);
            }
            $file = $request->file('file');
            $path = $file->store('submissions/'.$assignment->id, 'public');
            $submission->file_path = $path;
            $submission->file_name = $file->getClientOriginalName();
        }

        $submittedAt = now();
        $submission->content = $data['content'] ?? $submission->content;
        $submission->submitted_at = $submittedAt;
        $submission->status = $this->submissionService->statusForSubmit($assignment, $submittedAt);
        $submission->save();

        $submission->load(['student.user', 'assignment.course']);

        return response()->json([
            'message' => 'Submission uploaded successfully.',
            'data' => $submission,
        ], $submission->wasRecentlyCreated ? 201 : 200);
    }

    public function review(Request $request, Submission $submission): JsonResponse
    {
        $user = $request->user();
        $assignment = $submission->assignment;

        if (! $assignment || ! $this->canManageAssignment($user, $assignment)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'score' => ['nullable', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:reviewed,pending,submitted,late'],
        ]);

        $submission->update([
            'score' => $data['score'] ?? $submission->score,
            'feedback' => $data['feedback'] ?? $submission->feedback,
            'status' => $data['status'] ?? SubmissionService::STATUS_REVIEWED,
            'graded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Submission reviewed successfully.',
            'data' => $submission->fresh()->load(['student.user', 'assignment']),
        ]);
    }

    public function downloadFile(Request $request, Submission $submission): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        $assignment = $submission->assignment;

        if (! $assignment) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $canAccess = $this->canManageAssignment($user, $assignment)
            || ($user->isStudent() && $user->student && $submission->student_id === $user->student->id);

        if (! $canAccess) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! $submission->file_path || ! Storage::disk('public')->exists($submission->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $name = $submission->file_name ?? basename($submission->file_path);

        return Storage::disk('public')->download($submission->file_path, $name);
    }

    protected function canStudentSubmit(User $user, Assignment $assignment): bool
    {
        if (! $user->student) {
            return false;
        }

        $enrolled = $user->student->courses()
            ->where('courses.id', $assignment->course_id)
            ->exists();

        if (! $enrolled) {
            return false;
        }

        return $assignment->status === null || $assignment->status === 'published';
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
}
