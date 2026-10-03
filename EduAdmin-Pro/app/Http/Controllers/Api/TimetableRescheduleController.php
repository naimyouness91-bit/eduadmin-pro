<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimetableEntry;
use App\Models\TimetableRescheduleRequest;
use App\Services\TimetableRescheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TimetableRescheduleController extends Controller
{
    public function __construct(
        protected TimetableRescheduleService $rescheduleService
    ) {}

    public function upcomingSessions(Request $request): JsonResponse
    {
        $this->requireTeacher($request);

        $sessions = $this->rescheduleService->upcomingSessionsForTeacher($request->user());

        return response()->json([
            'data' => $sessions->map(fn ($e) => app(\App\Services\TimetableService::class)->formatEntryPublic($e))->values(),
        ]);
    }

    public function availableSlots(Request $request, TimetableEntry $entry): JsonResponse
    {
        $this->requireTeacher($request);

        try {
            $slots = $this->rescheduleService->findAvailableSlots($entry, $request->user());
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'data' => [
                'entry' => app(\App\Services\TimetableService::class)->formatEntryPublic(
                    $entry->load(['course', 'teacher.user', 'timetable.classSection'])
                ),
                'available_slots' => $slots,
            ],
        ]);
    }

    public function store(Request $request, TimetableEntry $entry): JsonResponse
    {
        $this->requireTeacher($request);

        $data = $request->validate([
            'proposed_day_of_week' => ['required', 'integer', 'min:1', 'max:6'],
            'proposed_start_time' => ['required', 'string', 'max:5'],
            'proposed_end_time' => ['required', 'string', 'max:5'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $rescheduleRequest = $this->rescheduleService->createRequest(
                $entry,
                $request->user(),
                (int) $data['proposed_day_of_week'],
                $data['proposed_start_time'],
                $data['proposed_end_time'],
                $data['reason'] ?? null
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Reschedule request submitted for admin approval.',
            'data' => $this->rescheduleService->formatRequest($rescheduleRequest),
        ], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $this->requireTeacher($request);

        $requests = $this->rescheduleService->listForTeacher($request->user());

        return response()->json([
            'data' => $requests->map(fn ($r) => $this->rescheduleService->formatRequest($r))->values(),
        ]);
    }

    public function cancel(Request $request, TimetableRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $this->requireTeacher($request);

        try {
            $updated = $this->rescheduleService->cancelRequest($rescheduleRequest, $request->user());
        } catch (ValidationException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => $e->errors()], 422);
        }

        return response()->json([
            'message' => 'Reschedule request cancelled.',
            'data' => $this->rescheduleService->formatRequest($updated),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $status = $request->query('status');
        $requests = $this->rescheduleService->listForAdmin($status);

        return response()->json([
            'data' => $requests->map(fn ($r) => $this->rescheduleService->formatRequest($r))->values(),
        ]);
    }

    public function approve(Request $request, TimetableRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $updated = $this->rescheduleService->approveRequest(
                $rescheduleRequest,
                $request->user(),
                $data['admin_notes'] ?? null
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Reschedule request approved. Timetable updated.',
            'data' => $this->rescheduleService->formatRequest($updated),
        ]);
    }

    public function reject(Request $request, TimetableRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $updated = $this->rescheduleService->rejectRequest(
                $rescheduleRequest,
                $request->user(),
                $data['admin_notes'] ?? null
            );
        } catch (ValidationException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => $e->errors()], 422);
        }

        return response()->json([
            'message' => 'Reschedule request rejected.',
            'data' => $this->rescheduleService->formatRequest($updated),
        ]);
    }

    protected function requireTeacher(Request $request): void
    {
        $user = $request->user();
        if (! $user->isTeacher() || ! $user->teacher) {
            abort(403, 'Teachers only.');
        }
    }

    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user->hasRole(['super_admin', 'admin'])) {
            abort(403, 'Forbidden.');
        }
    }
}
