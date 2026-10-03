<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentModel;
use App\Services\ParentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    public function __construct(
        protected ParentService $parentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = ParentModel::query()->with(['user', 'students.user']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('occupation', 'like', "%{$search}%")
                    ->orWhere('relationship', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })
                    ->orWhereHas('students.user', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $active = $request->query('status') === 'active';
            $query->whereHas('user', fn ($q) => $q->where('is_active', $active));
        }

        if ($request->query('linked') === 'yes') {
            $query->whereHas('students');
        } elseif ($request->query('linked') === 'no') {
            $query->whereDoesntHave('students');
        }

        $parents = $query->latest()->paginate($request->integer('per_page', 15));

        $parents->getCollection()->transform(fn (ParentModel $parent) => $this->formatParent($parent));

        return response()->json($parents);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:50'],
            'national_id' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
        ]);

        $parent = $this->parentService->createParent($data);

        return response()->json([
            'message' => 'Parent created successfully.',
            'data' => $this->formatParent($parent, detailed: true),
        ], 201);
    }

    public function show(ParentModel $parent): JsonResponse
    {
        $parent->load(['user', 'students.user', 'students.courses']);

        return response()->json(['data' => $this->formatParent($parent, detailed: true)]);
    }

    public function update(Request $request, ParentModel $parent): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$parent->user_id],
            'password' => ['sometimes', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:50'],
            'national_id' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
        ]);

        $parent = $this->parentService->updateParent($parent, $data);

        return response()->json([
            'message' => 'Parent updated successfully.',
            'data' => $this->formatParent($parent, detailed: true),
        ]);
    }

    public function destroy(ParentModel $parent): JsonResponse
    {
        $this->parentService->deleteParent($parent);

        return response()->json(['message' => 'Parent deleted successfully.']);
    }

    public function syncStudents(Request $request, ParentModel $parent): JsonResponse
    {
        $data = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:students,id'],
            'relationship' => ['nullable', 'string', 'max:50'],
        ]);

        $this->parentService->syncStudents(
            $parent,
            $data['student_ids'],
            $data['relationship'] ?? $parent->relationship ?? 'guardian'
        );

        $parent->load(['user', 'students.user']);

        return response()->json([
            'message' => 'Linked students updated.',
            'data' => $this->formatParent($parent, detailed: true),
        ]);
    }

    protected function formatParent(ParentModel $parent, bool $detailed = false): array
    {
        $students = $parent->students->map(fn ($s) => [
            'id' => $s->id,
            'student_id' => $s->student_id,
            'name' => $s->user?->name,
            'grade_level' => $s->grade_level,
            'relationship' => $s->pivot->relationship,
            'is_primary' => (bool) $s->pivot->is_primary,
        ])->values();

        $linkedLabel = $students->isEmpty()
            ? null
            : $students->pluck('name')->filter()->implode(', ');

        $payload = [
            'id' => $parent->id,
            'user_id' => $parent->user_id,
            'name' => $parent->user?->name,
            'email' => $parent->user?->email,
            'phone' => $parent->user?->phone,
            'is_active' => (bool) $parent->user?->is_active,
            'occupation' => $parent->occupation,
            'relationship' => $parent->relationship,
            'linked_students_label' => $linkedLabel,
            'students_count' => $students->count(),
            'created_at' => $parent->created_at,
        ];

        if ($detailed) {
            $payload['national_id'] = $parent->national_id;
            $payload['notes'] = $parent->notes;
            $payload['address'] = $parent->user?->address;
            $payload['students'] = $students;
        }

        return $payload;
    }
}
