<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesCourseAccess;
use App\Http\Controllers\Concerns\AuthorizesParentChildAccess;
use App\Models\Absence;
use App\Models\Course;
use App\Models\Student;
use App\Services\AttendanceService;
use App\Services\ActivityLogService;
use App\Services\AuthService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AttendanceController extends Controller
{
    use AuthorizesCourseAccess;
    use AuthorizesParentChildAccess;

    public function __construct(
        protected AttendanceService $attendanceService,
        protected AuthService $authService,
        protected NotificationService $notificationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->denyParentFromGlobalList(
            $user,
            'Use GET /api/parent/children/{student}/attendance for your child\'s attendance.'
        )) {
            return $response;
        }

        $query = Absence::query()->with(['student.user', 'course', 'teacher.user']);

        if ($user?->isStudent() && $user->student) {
            $query->where('student_id', $user->student->id);
        } elseif ($user?->isTeacher() && $user->teacher) {
            $query->whereHas('course', fn ($q) => $q->where('teacher_id', $user->teacher->id));
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->query('course_id'));
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->query('student_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('date', $request->query('date'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $records = $query->latest('date')->paginate($request->integer('per_page', 15));

        return response()->json($records);
    }

    public function mark(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'student_id' => ['required', 'exists:students,id'],
            'date' => ['required', 'date'],
            'status' => ['required', 'string', 'in:present,absent,late,excused'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'notes' => ['nullable', 'string'],
            'method' => ['nullable', 'string'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $this->attendanceService->bulkMark(
            $data['course_id'],
            $data['date'],
            [[
                'student_id' => $data['student_id'],
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'method' => $data['method'] ?? 'manual',
            ]],
            $data['teacher_id'] ?? null
        );

        $record = Absence::where([
            'course_id' => $data['course_id'],
            'student_id' => $data['student_id'],
            'date' => $data['date'],
        ])->with(['student.user', 'course'])->first();

        $this->logAttendanceUpdate($request, [$data['student_id']], $data['course_id'], $data['date']);

        return response()->json([
            'message' => 'Attendance recorded.',
            'data' => $record,
        ], 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['required', 'date'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'attendance' => ['required', 'array', 'min:1'],
            'attendance.*.student_id' => ['required', 'exists:students,id'],
            'attendance.*.status' => ['required', 'string', 'in:present,absent,late,excused'],
            'attendance.*.notes' => ['nullable', 'string'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $this->attendanceService->bulkMark(
            $data['course_id'],
            $data['date'],
            $data['attendance'],
            $data['teacher_id'] ?? null
        );

        $studentIds = collect($data['attendance'])->pluck('student_id')->unique()->all();
        $this->logAttendanceUpdate($request, $studentIds, $data['course_id'], $data['date']);

        return response()->json(['message' => 'Bulk attendance recorded successfully.'], 201);
    }

    public function generateQr(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'date' => ['required', 'date'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $result = $this->attendanceService->generateQrCode(
            $data['course_id'],
            $data['date']
        );

        return response()->json($result, 201);
    }

    public function scanQr(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'size:32'],
            'student_id' => ['required', 'exists:students,id'],
        ]);

        $user = $request->user();
        if (! $user->isStudent() || ! $user->student) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if ((int) $user->student->id !== (int) $data['student_id']) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        try {
            $result = $this->attendanceService->markByQr(
                $data['token'],
                $data['student_id']
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! empty($result['student_id'])) {
            $this->logAttendanceUpdate(
                $request,
                [$result['student_id']],
                $result['course_id'] ?? null,
                $result['date'] ?? null
            );
        }

        return response()->json($result);
    }

    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        if ($response = $this->denyUnlessCanManageCourse($request->user(), $course)) {
            return $response;
        }

        $report = $this->attendanceService->getReport(
            $data['course_id'],
            $data['from'],
            $data['to']
        );

        return response()->json($report);
    }

    /**
     * @param  array<int, int|string>  $studentIds
     */
    protected function logAttendanceUpdate(Request $request, array $studentIds, ?int $courseId, ?string $date): void
    {
        $user = $request->user();
        if (! $user) {
            return;
        }

        $this->authService->logActivity(
            $user,
            ActivityLogService::ACTION_ATTENDANCE_UPDATED,
            'Attendance records updated.',
            [
                'model_type' => Absence::class,
                'new_values' => [
                    'course_id' => $courseId,
                    'date' => $date,
                    'student_ids' => $studentIds,
                ],
            ]
        );

        foreach (array_unique($studentIds) as $studentId) {
            $student = Student::with('parents.user')->find($studentId);
            if (! $student) {
                continue;
            }

            $rate = (float) ($student->attendance_rate ?? 100);
            if ($rate < NotificationService::HIGH_ABSENCE_THRESHOLD) {
                $this->notificationService->notifyHighAbsence($student, $rate);
            }
        }
    }
}
