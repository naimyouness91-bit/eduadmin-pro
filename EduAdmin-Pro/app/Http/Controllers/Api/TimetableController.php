<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassSection;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Services\TimetableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TimetableController extends Controller
{
    public function __construct(
        protected TimetableService $timetableService
    ) {}

    public function meta(): JsonResponse
    {
        return response()->json(['data' => $this->timetableService->periodsMeta()]);
    }

    public function classSections(): JsonResponse
    {
        return response()->json(['data' => $this->timetableService->listClassSections()]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $sectionId = $request->query('class_section_id');

        return response()->json([
            'data' => $this->timetableService->listTimetables($sectionId ? (int) $sectionId : null),
        ]);
    }

    public function overview(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'data' => $this->timetableService->overviewAllClasses(),
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isStudent()) {
            $payload = $this->timetableService->forStudent($user);
            if (! $payload) {
                return response()->json([
                    'message' => 'No timetable found for your class. Contact administration.',
                    'data' => null,
                ], 404);
            }

            return response()->json(['data' => $payload]);
        }

        if ($user->isTeacher()) {
            $payload = $this->timetableService->forTeacher($user);
            if (! $payload || empty($payload['cells'])) {
                return response()->json([
                    'message' => 'No teaching sessions assigned yet.',
                    'data' => $payload,
                ]);
            }

            return response()->json(['data' => $payload]);
        }

        if ($user->isParent()) {
            $children = $user->parent?->students()->with('user')->get() ?? collect();
            $payloads = [];
            foreach ($children as $child) {
                $fakeUser = $child->user;
                if ($fakeUser) {
                    $grid = $this->timetableService->forStudent($fakeUser);
                    if ($grid) {
                        $payloads[] = array_merge($grid, ['student' => $child->load('user')]);
                    }
                }
            }

            return response()->json(['data' => $payloads]);
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }

    public function autoGenerate(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'class_section_id' => ['required', 'exists:class_sections,id'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $section = ClassSection::query()->findOrFail($data['class_section_id']);

        try {
            $grid = $this->timetableService->autoGenerateForSection(
                $section,
                $request->user(),
                $data['publish'] ?? true
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage() ?: 'Automatic generation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Timetable generated and published for this class.',
            'data' => $grid,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'class_section_id' => ['required', 'exists:class_sections,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'academic_year' => ['nullable', 'string'],
            'semester' => ['nullable', 'string'],
        ]);

        $timetable = $this->timetableService->createTimetable($data, $request->user());

        return response()->json([
            'message' => 'Timetable created.',
            'data' => $this->timetableService->getTimetable($timetable),
        ], 201);
    }

    public function show(Request $request, Timetable $timetable): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin'])) {
            if ($user->isStudent() && ! $timetable->is_published) {
                return response()->json(['message' => 'Timetable not published.'], 403);
            }
            if ($user->isTeacher()) {
                $hasSlots = $timetable->entries()->where('teacher_id', $user->teacher?->id)->exists();
                if (! $hasSlots) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            }

            if ($user->isParent()) {
                $parent = $user->parent;
                if (! $parent) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }

                $allowedSectionIds = $parent->students()
                    ->get()
                    ->map(fn ($child) => ClassSection::resolveForStudent($child)?->id)
                    ->filter()
                    ->unique();

                if (
                    ! $timetable->is_published
                    || ! $allowedSectionIds->contains($timetable->class_section_id)
                ) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            }
        }

        return response()->json([
            'data' => $this->timetableService->gridPayload($timetable),
        ]);
    }

    public function update(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'academic_year' => ['nullable', 'string'],
            'semester' => ['nullable', 'string'],
        ]);

        $timetable->update($data);

        return response()->json([
            'message' => 'Timetable updated.',
            'data' => $this->timetableService->getTimetable($timetable->fresh()),
        ]);
    }

    public function destroy(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorizeAdmin($request);
        $timetable->delete();

        return response()->json(['message' => 'Timetable deleted.']);
    }

    public function duplicate(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $copy = $this->timetableService->duplicateTimetable(
            $this->timetableService->getTimetable($timetable),
            $request->user(),
            $data['name'] ?? null
        );

        return response()->json([
            'message' => 'Timetable duplicated.',
            'data' => $copy,
        ], 201);
    }

    public function publish(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorizeAdmin($request);

        $conflicts = $this->timetableService->detectConflicts($timetable);
        if ($conflicts->isNotEmpty()) {
            return response()->json([
                'message' => 'Cannot publish: resolve conflicts first.',
                'conflicts' => $conflicts,
            ], 422);
        }

        $published = $this->timetableService->publish($timetable);

        return response()->json([
            'message' => 'Timetable published for this class.',
            'data' => $this->timetableService->gridPayload($published),
        ]);
    }

    public function conflicts(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'data' => $this->timetableService->detectConflicts($timetable),
        ]);
    }

    public function sectionCourses(Request $request, ClassSection $classSection): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'data' => $this->timetableService->coursesForSection($classSection),
        ]);
    }

    public function storeClassSection(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'grade_level' => ['required', 'string', 'max:32'],
            'section' => ['required', 'string', 'max:16'],
            'academic_year' => ['nullable', 'string'],
        ]);

        $section = $this->timetableService->ensureClassSection(
            $data['grade_level'],
            $data['section'],
            $data['academic_year'] ?? null
        );

        return response()->json(['data' => $section], 201);
    }

    public function upsertEntry(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'id' => ['nullable', 'integer'],
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'course_id' => ['required', 'exists:courses,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'room' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $entry = DB::transaction(function () use ($timetable, $data) {
                $entry = $this->timetableService->upsertEntry(
                    $timetable,
                    $data,
                    $data['id'] ?? null
                );

                $conflicts = $this->timetableService->detectConflicts($timetable);
                if ($conflicts->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'conflicts' => $conflicts->values()->all(),
                    ]);
                }

                return $entry;
            });
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage() ?: 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Slot saved.',
            'data' => $this->timetableService->gridPayload($timetable->fresh()),
        ]);
    }

    public function moveEntry(Request $request, TimetableEntry $entry): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
        ]);

        try {
            DB::transaction(function () use ($entry, $data) {
                $this->timetableService->moveEntry(
                    $entry,
                    (int) $data['day_of_week'],
                    $data['start_time'],
                    $data['end_time']
                );

                $conflicts = $this->timetableService->detectConflicts($entry->timetable);
                if ($conflicts->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'conflicts' => $conflicts->values()->all(),
                    ]);
                }
            });
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Move blocked by conflict.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Session moved.',
            'data' => $this->timetableService->gridPayload($entry->timetable->fresh()),
        ]);
    }

    public function destroyEntry(Request $request, TimetableEntry $entry): JsonResponse
    {
        $this->authorizeAdmin($request);
        $timetable = $entry->timetable;
        $this->timetableService->deleteEntry($entry);

        return response()->json([
            'message' => 'Slot cleared.',
            'data' => $this->timetableService->gridPayload($timetable->fresh()),
        ]);
    }

    public function export(Request $request, Timetable $timetable): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(['super_admin', 'admin'])) {
            if ($user->isStudent()) {
                $student = $user->student;
                $section = $student ? \App\Models\ClassSection::resolveForStudent($student) : null;
                if (! $section || $timetable->class_section_id !== $section->id || ! $timetable->is_published) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            } elseif ($user->isTeacher()) {
                if (! $timetable->entries()->where('teacher_id', $user->teacher?->id)->exists()) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            } else {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        $format = strtolower((string) $request->query('format', 'pdf'));

        if ($format === 'html') {
            $html = $this->timetableService->renderHtml($timetable);
            $filename = 'emploi-du-temps.html';

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
            ]);
        }

        return $this->timetableService->pdfDownload($timetable);
    }

    protected function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->hasRole(['super_admin', 'admin'])) {
            abort(403, 'Only administrators can manage timetables.');
        }
    }
}
