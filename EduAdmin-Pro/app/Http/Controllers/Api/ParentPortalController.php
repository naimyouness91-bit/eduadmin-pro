<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\ParentPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentPortalController extends Controller
{
    public function __construct(
        protected ParentPortalService $portal
    ) {}

    public function children(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->portal->childrenFor($request->user()),
        ]);
    }

    public function showChild(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json([
            'data' => $this->portal->childDetail($student),
        ]);
    }

    public function childGrades(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json(
            $this->portal->childGrades($student, $request)
        );
    }

    public function childGradeStats(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json([
            'data' => $this->portal->childGradeStats($student, $request),
        ]);
    }

    public function childAssignments(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json(
            $this->portal->childAssignments($student, $request)
        );
    }

    public function childAttendance(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json(
            $this->portal->childAttendance($student, $request)
        );
    }

    public function childSchedule(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json($this->portal->childSchedule($student));
    }
}
