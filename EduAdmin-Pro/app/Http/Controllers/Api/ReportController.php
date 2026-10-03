<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\StudentBulletinService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReportController extends Controller
{
    public function __construct(
        protected StudentBulletinService $bulletinService
    ) {}

    public function bulletinStatus(Request $request, Student $student): JsonResponse
    {
        if ($response = $this->authorizeBulletinAccess($request, $student, $request->user()->isParent())) {
            return $response;
        }

        return response()->json([
            'data' => $this->bulletinService->statusPayload($student, $request->user()),
        ]);
    }

    public function bulletinPreview(Request $request, Student $student): JsonResponse
    {
        if ($response = $this->authorizeBulletinAccess($request, $student, $request->user()->isParent())) {
            return $response;
        }

        return response()->json([
            'data' => $this->bulletinService->previewPayload($student),
        ]);
    }

    /**
     * Admin: fetch bulletin status for many students in one request (Grades page).
     *
     * @return JsonResponse
     */
    public function batchBulletinStatus(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $ids = collect($request->input('student_ids', []))
            ->filter(fn ($id) => is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->take(100)
            ->values();

        $user = $request->user();
        $payload = [];

        foreach ($ids as $id) {
            $student = Student::query()->find($id);
            if ($student) {
                $payload[(string) $id] = $this->bulletinService->statusPayload($student, $user);
            }
        }

        return response()->json(['data' => $payload]);
    }

    public function generateBulletin(Request $request, Student $student): JsonResponse
    {
        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Only administrators can generate bulletins.'], 403);
        }

        $record = $this->bulletinService->markGenerated($student, $request->user());

        return response()->json([
            'message' => 'Bulletin generated successfully.',
            'data' => $this->bulletinService->statusPayload($student->fresh(), $request->user()),
        ]);
    }

    public function publishBulletin(Request $request, Student $student): JsonResponse
    {
        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Only administrators can publish bulletins.'], 403);
        }

        $record = $this->bulletinService->markPublished($student, $request->user());

        if (! $record->isPublished()) {
            return response()->json(['message' => 'Bulletin must be generated before publishing.'], 422);
        }

        return response()->json([
            'message' => 'Bulletin published successfully. Students and parents can now view it.',
            'data' => $this->bulletinService->statusPayload($student->fresh(), $request->user()),
        ]);
    }

    public function studentBulletin(Request $request, Student $student): Response|JsonResponse
    {
        $requirePublished = ! $request->user()->hasRole(['super_admin', 'admin']);

        if ($response = $this->authorizeBulletinAccess($request, $student, $requirePublished)) {
            return $response;
        }

        $format = strtolower((string) $request->query('format', 'pdf'));
        $disposition = strtolower((string) $request->query('disposition', 'attachment'));

        if ($format === 'html') {
            $html = $this->bulletinService->renderHtml($student);
            $filename = 'bulletin-'.($student->student_id ?? $student->id).'.html';

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
            ]);
        }

        if ($disposition === 'inline') {
            return $this->bulletinService->pdfInline($student);
        }

        return $this->bulletinService->pdfDownload($student);
    }

    /**
     * Teachers cannot access bulletins. Students/parents require published status when $requirePublished.
     */
    protected function authorizeBulletinAccess(Request $request, Student $student, bool $requirePublished): ?JsonResponse
    {
        $user = $request->user();

        if ($user->isTeacher()) {
            return response()->json(['message' => 'Teachers cannot access student bulletins.'], 403);
        }

        if ($user->hasRole(['super_admin', 'admin'])) {
            return null;
        }

        if ($user->isStudent()) {
            if ($user->student?->id !== $student->id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }

            if ($requirePublished && ! $this->bulletinService->isPublished($student)) {
                return response()->json(['message' => 'This bulletin has not been published yet.'], 403);
            }

            return null;
        }

        if ($user->isParent()) {
            $parent = $user->parent;
            if (! $parent || ! $parent->students()->where('students.id', $student->id)->exists()) {
                return response()->json(['message' => 'Access denied.'], 403);
            }

            if ($requirePublished && ! $this->bulletinService->isPublished($student)) {
                return response()->json(['message' => 'This bulletin has not been published yet.'], 403);
            }

            return null;
        }

        return response()->json(['message' => 'Access denied.'], 403);
    }
}
