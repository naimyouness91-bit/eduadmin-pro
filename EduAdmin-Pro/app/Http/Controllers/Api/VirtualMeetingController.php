<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingMessage;
use App\Models\MeetingResource;
use App\Models\VirtualMeeting;
use App\Services\JitsiMeetService;
use App\Services\VirtualMeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VirtualMeetingController extends Controller
{
    public function __construct(
        protected VirtualMeetingService $meetingService,
        protected JitsiMeetService $jitsi
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = VirtualMeeting::query()
            ->with(['creator:id,name,email,avatar', 'course:id,name,code'])
            ->withCount('participants');

        $this->meetingService->scopeForUser($query, $user);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('from')) {
            $query->where('scheduled_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->where('scheduled_at', '<=', $request->query('to'));
        }

        $meetings = $query->orderBy('scheduled_at')->paginate($request->integer('per_page', 20));

        return response()->json($meetings);
    }

    public function calendar(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = VirtualMeeting::query()
            ->with(['creator:id,name', 'course:id,name'])
            ->whereNotNull('scheduled_at');

        $this->meetingService->scopeForUser($query, $user);

        if ($from = $request->query('from')) {
            $query->where('scheduled_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('scheduled_at', '<=', $to);
        }

        $items = $query->orderBy('scheduled_at')->get()->map(fn (VirtualMeeting $m) => [
            'id' => $m->id,
            'title' => $m->title,
            'scheduled_at' => $m->scheduled_at,
            'ends_at' => $m->ends_at,
            'status' => $m->status,
            'course' => $m->course,
            'meeting_url' => $this->jitsi->meetingUrl($m->jitsi_room_name),
        ]);

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'course_id' => ['nullable', 'exists:courses,id'],
            'scheduled_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:scheduled_at'],
            'invite_course_students' => ['sometimes', 'boolean'],
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'student_ids' => ['sometimes', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
            'teacher_ids' => ['sometimes', 'array'],
            'teacher_ids.*' => ['integer', 'exists:teachers,id'],
        ]);

        if ($user->isTeacher() && ! $user->hasRole(['super_admin', 'admin'])) {
            if (empty($data['course_id'])) {
                return response()->json(['message' => 'Teachers must link meetings to their course.'], 422);
            }

            $owns = $user->teacher?->courses()->where('id', $data['course_id'])->exists();
            if (! $owns) {
                return response()->json(['message' => 'You can only create meetings for your courses.'], 403);
            }

            $data['invite_course_students'] = $data['invite_course_students'] ?? true;
            unset($data['teacher_ids']);
        }

        $meeting = $this->meetingService->create($user, $data);

        return response()->json([
            'message' => 'Meeting created.',
            'data' => $this->formatMeeting($meeting),
        ], 201);
    }

    public function show(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $meeting->load(['creator:id,name,email,avatar', 'course:id,name,code'])
            ->loadCount('participants');

        return response()->json([
            'data' => $this->formatMeeting($meeting),
            'permissions' => $this->permissions($request->user(), $meeting),
        ]);
    }

    public function update(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canManage($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:scheduled,live,ended,cancelled'],
        ]);

        $meeting->update($data);

        return response()->json([
            'message' => 'Meeting updated.',
            'data' => $this->formatMeeting($meeting->fresh(['creator', 'course'])),
        ]);
    }

    public function destroy(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canManage($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $meeting->update(['status' => VirtualMeeting::STATUS_CANCELLED]);
        $meeting->delete();

        return response()->json(['message' => 'Meeting cancelled.']);
    }

    public function join(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = $request->user();
        $participant = $this->meetingService->recordJoin($meeting, $user);
        $role = $participant->role;

        return response()->json([
            'data' => [
                'meeting' => $this->formatMeeting($meeting->fresh()),
                'jitsi' => $this->jitsi->joinConfig($meeting, $user, $role),
                'participant' => $participant,
            ],
        ]);
    }

    public function leave(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->meetingService->recordLeave($meeting, $request->user());

        return response()->json(['message' => 'Left meeting.']);
    }

    public function participants(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $participants = $meeting->participants()
            ->with('user:id,name,email,avatar,role')
            ->orderByDesc('hand_raised')
            ->orderBy('role')
            ->get();

        return response()->json(['data' => $participants]);
    }

    public function invite(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canManage($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'user_ids' => ['sometimes', 'array'],
            'student_ids' => ['sometimes', 'array'],
            'teacher_ids' => ['sometimes', 'array'],
        ]);

        $inviter = $request->user();

        if (! empty($data['user_ids'])) {
            $this->meetingService->inviteUsers($meeting, $data['user_ids'], $inviter);
        }

        if (! empty($data['student_ids'])) {
            $this->meetingService->inviteStudents(
                $meeting,
                $data['student_ids'],
                $inviter,
                $meeting->course_id
            );
        }

        if (! empty($data['teacher_ids']) && $inviter->hasRole(['super_admin', 'admin'])) {
            $this->meetingService->inviteTeachers($meeting, $data['teacher_ids'], $inviter);
        }

        return response()->json([
            'message' => 'Invitations sent.',
            'data' => $meeting->participants()->with('user:id,name,email,avatar,role')->get(),
        ]);
    }

    public function attendance(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canManage($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'data' => $this->meetingService->attendanceSummary($meeting),
        ]);
    }

    public function messages(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $messages = $meeting->messages()
            ->with('user:id,name,email,avatar')
            ->orderBy('created_at')
            ->paginate($request->integer('per_page', 100));

        return response()->json($messages);
    }

    public function sendMessage(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        $message = MeetingMessage::create([
            'virtual_meeting_id' => $meeting->id,
            'user_id' => $request->user()->id,
            'type' => MeetingMessage::TYPE_CHAT,
            'content' => $data['content'],
        ]);

        return response()->json([
            'message' => 'Message sent.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function raiseHand(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'raised' => ['sometimes', 'boolean'],
        ]);

        $raised = $data['raised'] ?? true;
        $this->meetingService->setHandRaised($meeting, $request->user(), $raised);

        return response()->json([
            'message' => $raised ? 'Hand raised.' : 'Hand lowered.',
            'raised' => $raised,
        ]);
    }

    public function resources(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $resources = $meeting->resources()
            ->with('uploader:id,name,email')
            ->latest()
            ->get();

        return response()->json(['data' => $resources]);
    }

    public function uploadResource(Request $request, VirtualMeeting $meeting): JsonResponse
    {
        if (! $this->meetingService->canManage($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,zip,txt'],
        ]);

        $file = $data['file'];
        $path = $file->store("meetings/{$meeting->id}", 'public');

        $resource = MeetingResource::create([
            'virtual_meeting_id' => $meeting->id,
            'uploaded_by' => $request->user()->id,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Resource uploaded.',
            'data' => $resource->load('uploader:id,name'),
        ], 201);
    }

    public function downloadResource(
        Request $request,
        VirtualMeeting $meeting,
        MeetingResource $resource
    ): StreamedResponse|JsonResponse {
        if (! $this->meetingService->canAccess($request->user(), $meeting)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($resource->virtual_meeting_id !== $meeting->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (! Storage::disk('public')->exists($resource->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk('public')->download($resource->file_path, $resource->file_name);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatMeeting(VirtualMeeting $meeting): array
    {
        $data = $meeting->toArray();
        $data['meeting_url'] = $this->jitsi->meetingUrl($meeting->jitsi_room_name);
        $data['jitsi_domain'] = $this->jitsi->domain();

        return $data;
    }

    /**
     * @return array<string, bool>
     */
    protected function permissions($user, VirtualMeeting $meeting): array
    {
        return [
            'can_manage' => $this->meetingService->canManage($user, $meeting),
            'can_join' => $this->meetingService->canAccess($user, $meeting),
        ];
    }
}
