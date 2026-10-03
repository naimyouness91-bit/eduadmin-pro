<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Group;
use App\Models\GroupMessage;
use App\Models\GroupMember;
use App\Models\User;
use App\Services\GroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GroupController extends Controller
{
    public function __construct(
        protected GroupService $groupService
    ) {}

    public function presets(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['data' => $this->groupService->adminPresets()]);
    }

    public function teacherPresets(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['data' => $this->groupService->teacherPresets($user)]);
    }

    public function eligibleStudents(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = $request->user();

        if ($user->isTeacher() && ! $user->hasRole(['super_admin', 'admin']) && $group->course_id) {
            if (! $this->groupService->teacherOwnsCourse($user, (int) $group->course_id)) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $students = $this->groupService->eligibleStudentsForGroup($group);

        return response()->json(['data' => $students->load('user:id,name,email,avatar')]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Group::query()
            ->with(['creator:id,name,email,avatar', 'course:id,name,code'])
            ->withCount('members', 'messages');

        $this->groupService->scopeGroupsForUser($query, $user);

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $groups = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($groups);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $typeRule = $user->isTeacher() && ! $user->hasRole(['super_admin', 'admin'])
            ? ['sometimes', 'string', 'in:'.implode(',', Group::TYPES)]
            : ['required', 'string', 'in:'.implode(',', Group::TYPES)];

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => $typeRule,
            'audience' => ['sometimes', 'string', 'in:'.implode(',', Group::AUDIENCES)],
            'include_all_teachers' => ['sometimes', 'boolean'],
            'course_id' => ['nullable', 'exists:courses,id'],
            'allow_student_messages' => ['sometimes', 'boolean'],
            'allow_student_files' => ['sometimes', 'boolean'],
            'allow_discussions' => ['sometimes', 'boolean'],
            'student_ids' => ['sometimes', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
            'teacher_ids' => ['sometimes', 'array'],
            'teacher_ids.*' => ['integer', 'exists:teachers,id'],
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        if ($user->hasRole(['super_admin', 'admin'])) {
            if ($data['type'] === Group::TYPE_COURSE && empty($data['course_id'])) {
                return response()->json(['message' => 'Course is required for course groups.'], 422);
            }
        }

        if ($user->isTeacher() && ! $user->hasRole(['super_admin', 'admin'])) {
            $data['type'] = Group::TYPE_COURSE;
            $data['audience'] = Group::AUDIENCE_CUSTOM;
            $data['include_all_teachers'] = false;
            unset($data['teacher_ids'], $data['user_ids']);

            if (empty($data['course_id'])) {
                return response()->json(['message' => 'Course is required for course groups.'], 422);
            }

            if (! $this->groupService->teacherOwnsCourse($user, (int) $data['course_id'])) {
                return response()->json(['message' => 'You can only create groups for your assigned courses.'], 403);
            }

            if (! empty($data['student_ids'])) {
                $filtered = $this->groupService->filterStudentIdsForCourse(
                    $data['student_ids'],
                    (int) $data['course_id']
                );

                if (count($filtered) !== count($data['student_ids'])) {
                    return response()->json([
                        'message' => 'You can only add students enrolled in this course.',
                    ], 422);
                }

                $data['student_ids'] = $filtered;
            }

            if (empty(trim($data['name'] ?? '')) && ! empty($data['course_id'])) {
                $course = \App\Models\Course::find($data['course_id']);
                $data['name'] = $course ? $course->name.' Group' : 'Course Group';
            }
        }

        $group = $this->groupService->createGroup($user, $data);

        return response()->json([
            'message' => 'Group created successfully.',
            'data' => $group,
        ], 201);
    }

    public function show(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canAccessGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $group->load([
            'creator:id,name,email,avatar',
            'course:id,name,code',
            'members.user:id,name,email,avatar,role',
        ])->loadCount('members', 'messages');

        $membership = $this->groupService->membership($request->user(), $group);

        return response()->json([
            'data' => $group,
            'permissions' => [
                'can_manage' => $this->groupService->canManageGroup($request->user(), $group),
                'can_send_messages' => $this->groupService->canSendMessage($request->user(), $group),
                'can_upload_files' => $this->groupService->canUploadFile($request->user(), $group),
                'can_create_discussion' => $this->groupService->canManageGroup($request->user(), $group)
                    && $group->allow_discussions,
                'can_schedule_session' => $this->groupService->canManageGroup($request->user(), $group),
                'membership_role' => $membership?->role,
            ],
        ]);
    }

    public function update(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'allow_student_messages' => ['sometimes', 'boolean'],
            'allow_student_files' => ['sometimes', 'boolean'],
            'allow_discussions' => ['sometimes', 'boolean'],
        ]);

        $group->update($data);

        return response()->json([
            'message' => 'Group updated.',
            'data' => $group->fresh(['creator', 'course']),
        ]);
    }

    public function destroy(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $group->delete();

        return response()->json(['message' => 'Group deleted.']);
    }

    public function refreshAudience(Request $request, Group $group): JsonResponse
    {
        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $added = $this->groupService->refreshAudienceMembers($group);

        return response()->json([
            'message' => "Audience refreshed. {$added} member(s) synced.",
            'data' => $group->fresh()->loadCount('members'),
        ]);
    }

    public function members(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canAccessGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $members = $group->members()->with('user:id,name,email,avatar,role')->get();

        return response()->json(['data' => $members]);
    }

    public function addMembers(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'student_ids' => ['sometimes', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
            'teacher_ids' => ['sometimes', 'array'],
            'teacher_ids.*' => ['integer', 'exists:teachers,id'],
        ]);

        try {
            $this->groupService->addMembersFromRequest($group, $request->user(), $data);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Members updated.',
            'data' => $group->members()->with('user:id,name,email,avatar,role')->get(),
        ]);
    }

    public function removeMember(Request $request, Group $group, User $user): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $membership = $group->members()->where('user_id', $user->id)->first();

        if (! $membership) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        if ($membership->isOwner()) {
            return response()->json(['message' => 'Cannot remove the group owner.'], 422);
        }

        $membership->delete();

        return response()->json(['message' => 'Member removed.']);
    }

    public function messages(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canAccessGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = $group->messages()->with('user:id,name,email,avatar');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $messages = $query->orderBy('created_at')->paginate($request->integer('per_page', 50));

        return response()->json($messages);
    }

    public function sendMessage(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canSendMessage($request->user(), $group)) {
            return response()->json(['message' => 'You do not have permission to send messages in this group.'], 403);
        }

        $data = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
            'type' => ['sometimes', 'string', 'in:text,discussion'],
        ]);

        $type = $data['type'] ?? GroupMessage::TYPE_TEXT;

        if ($type === GroupMessage::TYPE_DISCUSSION && ! $group->allow_discussions) {
            return response()->json(['message' => 'Discussions are disabled for this group.'], 422);
        }

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'type' => $type,
            'content' => $data['content'],
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $request->user(),
            'New group message',
            \Illuminate\Support\Str::limit($data['content'], 80),
            ['group_message_id' => $message->id]
        );

        return response()->json([
            'message' => 'Message sent.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function createDiscussion(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! $group->allow_discussions) {
            return response()->json(['message' => 'Discussions are disabled for this group.'], 422);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:10000'],
        ]);

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'type' => GroupMessage::TYPE_DISCUSSION,
            'content' => $data['content'],
            'metadata' => ['title' => $data['title']],
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $request->user(),
            'New discussion: '.$data['title'],
            \Illuminate\Support\Str::limit($data['content'], 120),
            ['group_message_id' => $message->id, 'type' => 'discussion']
        );

        return response()->json([
            'message' => 'Discussion started.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function scheduleSession(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'meeting_url' => ['required', 'url', 'max:500'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'description' => ['nullable', 'string'],
        ]);

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'type' => GroupMessage::TYPE_MEETING,
            'content' => $data['description'] ?? $data['title'],
            'metadata' => [
                'title' => $data['title'],
                'meeting_url' => $data['meeting_url'],
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'] ?? null,
                'kind' => 'session',
            ],
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $request->user(),
            'Live session scheduled',
            $data['title'].' — '.$data['starts_at'],
            ['group_message_id' => $message->id, 'type' => 'session']
        );

        return response()->json([
            'message' => 'Session scheduled.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function postAnnouncement(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ]);

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'type' => GroupMessage::TYPE_ANNOUNCEMENT,
            'content' => $data['content'],
            'metadata' => ['title' => $data['title']],
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $request->user(),
            $data['title'],
            \Illuminate\Support\Str::limit($data['content'], 120),
            ['group_message_id' => $message->id, 'type' => 'announcement']
        );

        return response()->json([
            'message' => 'Announcement posted.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function scheduleMeeting(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canManageGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'meeting_url' => ['required', 'url', 'max:500'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'description' => ['nullable', 'string'],
        ]);

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'type' => GroupMessage::TYPE_MEETING,
            'content' => $data['description'] ?? $data['title'],
            'metadata' => [
                'title' => $data['title'],
                'meeting_url' => $data['meeting_url'],
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'] ?? null,
            ],
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $request->user(),
            'Group meeting scheduled',
            $data['title'].' — '.$data['starts_at'],
            ['group_message_id' => $message->id, 'type' => 'meeting']
        );

        return response()->json([
            'message' => 'Meeting scheduled.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function uploadFile(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canUploadFile($request->user(), $group)) {
            return response()->json(['message' => 'You do not have permission to upload files.'], 403);
        }

        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,zip,txt'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $file = $data['file'];
        $path = $file->store("groups/{$group->id}", 'public');

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'type' => GroupMessage::TYPE_FILE,
            'content' => $data['description'] ?? $file->getClientOriginalName(),
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $request->user(),
            'New file shared',
            $file->getClientOriginalName(),
            ['group_message_id' => $message->id, 'type' => 'file']
        );

        return response()->json([
            'message' => 'File uploaded.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function shareAssignment(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin', 'teacher'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! $this->groupService->canManageGroup($user, $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'assignment_id' => ['required', 'exists:assignments,id'],
            'note' => ['nullable', 'string'],
        ]);

        $assignment = Assignment::with('course')->findOrFail($data['assignment_id']);

        if ($user->isTeacher() && $assignment->teacher_id !== $user->teacher?->id) {
            return response()->json(['message' => 'You can only share your own assignments.'], 403);
        }

        if ($group->course_id && $assignment->course_id !== (int) $group->course_id) {
            return response()->json([
                'message' => 'Assignment must belong to the same course as this group.',
            ], 422);
        }

        $message = GroupMessage::create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'type' => GroupMessage::TYPE_ASSIGNMENT,
            'content' => $data['note'] ?? "Assignment: {$assignment->title}",
            'metadata' => [
                'assignment_id' => $assignment->id,
                'assignment_title' => $assignment->title,
                'course_name' => $assignment->course?->name,
                'due_date' => $assignment->due_date?->toIso8601String(),
            ],
        ]);

        $this->groupService->notifyGroupMembers(
            $group,
            $user,
            'New assignment in group',
            $assignment->title,
            ['assignment_id' => $assignment->id, 'group_id' => $group->id]
        );

        return response()->json([
            'message' => 'Assignment shared.',
            'data' => $message->load('user:id,name,email,avatar'),
        ], 201);
    }

    public function downloadFile(Request $request, Group $group, GroupMessage $message): StreamedResponse|JsonResponse
    {
        if (! $this->groupService->canAccessGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($message->group_id !== $group->id || $message->type !== GroupMessage::TYPE_FILE || ! $message->file_path) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        if (! Storage::disk('public')->exists($message->file_path)) {
            return response()->json(['message' => 'File not found on disk.'], 404);
        }

        return Storage::disk('public')->download($message->file_path, $message->file_name ?? 'file');
    }

    public function files(Request $request, Group $group): JsonResponse
    {
        if (! $this->groupService->canAccessGroup($request->user(), $group)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $files = $group->messages()
            ->where('type', GroupMessage::TYPE_FILE)
            ->with('user:id,name,email,avatar')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($files);
    }
}
