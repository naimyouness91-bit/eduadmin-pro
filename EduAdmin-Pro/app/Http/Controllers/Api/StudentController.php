<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\AuthorizesCourseAccess;
use App\Models\Student;
use App\Services\ActivityLogService;
use App\Services\AuthService;
use App\Services\StudentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    use AuthorizesCourseAccess;

    public function __construct(
        protected StudentService $studentService,
        protected AuthService $authService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Student::query()
            ->with('user')
            ->whereHas('user', fn ($q) => $q->whereNull('deleted_at'));

        if ($user?->isTeacher() && ! $user->hasRole(['super_admin', 'admin'])) {
            $query->where('enrollment_status', 'active');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('student_id', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('grade_level')) {
            $query->where('grade_level', $request->query('grade_level'));
        }

        if ($request->filled('enrollment_status')) {
            $query->where('enrollment_status', $request->query('enrollment_status'));
        }

        if ($request->filled('section')) {
            $query->where('section', $request->query('section'));
        }

        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = strtolower($request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        match ($sortBy) {
            'name' => $query->join('users', 'students.user_id', '=', 'users.id')
                ->select('students.*')
                ->orderBy('users.name', $sortDir),
            'student_id', 'grade_level', 'section', 'enrollment_status', 'enrollment_date', 'created_at' => $query->orderBy($sortBy, $sortDir),
            default => $query->latest(),
        };

        $students = $query->paginate($request->integer('per_page', 15));
        $students->through(fn (Student $student) => $student->setAppends([]));

        return response()->json($students);
    }

    public function stats(): JsonResponse
    {
        $base = Student::query()
            ->whereHas('user', fn ($q) => $q->whereNull('deleted_at'));

        return response()->json([
            'total' => (clone $base)->count(),
            'active' => (clone $base)->where('enrollment_status', 'active')->count(),
            'inactive' => (clone $base)->where('enrollment_status', 'inactive')->count(),
            'graduated' => (clone $base)->where('enrollment_status', 'graduated')->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'student_id' => $request->filled('student_id') ? trim((string) $request->input('student_id')) : null,
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'student_id' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('students', 'student_id')->whereNull('deleted_at'),
            ],
            'grade_level' => ['nullable', 'string'],
            'section' => ['nullable', 'string'],
            'enrollment_status' => ['nullable', 'string'],
            'enrollment_date' => ['nullable', 'date'],
            'guardian_name' => ['nullable', 'string'],
            'guardian_phone' => ['nullable', 'string'],
            'guardian_email' => ['nullable', 'email'],
            'blood_group' => ['nullable', 'string'],
            'medical_notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:male,female,other'],
            'avatar' => ['nullable', 'image', 'max:2048'],
            'create_parent_account' => ['sometimes', 'boolean'],
            'parent_name' => ['required_if:create_parent_account,1,true', 'nullable', 'string', 'max:255'],
            'parent_email' => ['required_if:create_parent_account,1,true', 'nullable', 'email', 'unique:users,email'],
            'parent_phone' => ['nullable', 'string', 'max:50'],
            'parent_relationship' => ['required_if:create_parent_account,1,true', 'nullable', 'string', 'in:father,mother,guardian'],
        ], $this->studentValidationMessages());

        $data['create_parent_account'] = $request->boolean('create_parent_account');

        if ($request->hasFile('avatar')) {
            $data['avatar_path'] = $request->file('avatar')->store('avatars', 'public');
            if ($user = $request->user()) {
                $this->authService->logActivity($user, ActivityLogService::ACTION_FILE_UPLOAD, 'Student avatar uploaded.', [
                    'new_values' => ['path' => $data['avatar_path'], 'type' => 'student_avatar'],
                ]);
            }
        }

        $result = $this->studentService->createStudent($data);

        $payload = [
            'message' => 'Student created successfully.',
            'data' => $result['student'],
        ];

        if ($result['parent_credentials']) {
            $payload['parent_credentials'] = $result['parent_credentials'];
            $payload['message'] = 'Student and parent account created successfully.';
        }

        return response()->json($payload, 201);
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        if ($response = $this->denyUnlessCanViewStudent($request->user(), $student)) {
            return $response;
        }

        $student->load(['user', 'courses.teacher.user', 'parents.user']);

        return response()->json([
            'data' => $student,
            'stats' => [
                'courses_count' => $student->courses()->count(),
                'grades_count' => $student->grades()->count(),
                'average_grade' => $student->average_grade,
                'attendance_rate' => $student->attendance_rate,
                'absences_count' => $student->absences()->count(),
            ],
        ]);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        if ($request->has('student_id')) {
            $request->merge([
                'student_id' => trim((string) $request->input('student_id')),
            ]);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$student->user_id],
            'password' => ['sometimes', 'string', 'min:8'],
            'student_id' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('students', 'student_id')
                    ->ignore($student->id)
                    ->whereNull('deleted_at'),
            ],
            'grade_level' => ['nullable', 'string'],
            'section' => ['nullable', 'string'],
            'enrollment_status' => ['nullable', 'string'],
            'enrollment_date' => ['nullable', 'date'],
            'guardian_name' => ['nullable', 'string'],
            'guardian_phone' => ['nullable', 'string'],
            'guardian_email' => ['nullable', 'email'],
            'blood_group' => ['nullable', 'string'],
            'medical_notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:male,female,other'],
            'is_active' => ['sometimes', 'boolean'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ], $this->studentValidationMessages());

        if ($request->hasFile('avatar')) {
            if ($student->user?->avatar) {
                Storage::disk('public')->delete($student->user->avatar);
            }
            $data['avatar_path'] = $request->file('avatar')->store('avatars', 'public');
            if ($user = $request->user()) {
                $this->authService->logActivity($user, ActivityLogService::ACTION_FILE_UPLOAD, 'Student avatar uploaded.', [
                    'model_type' => Student::class,
                    'model_id' => $student->id,
                    'new_values' => ['path' => $data['avatar_path'], 'type' => 'student_avatar'],
                ]);
            }
        }

        $student = $this->studentService->updateStudent($student, $data);

        return response()->json([
            'message' => 'Student updated successfully.',
            'data' => $student,
        ]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $name = $student->user?->name;
        $studentId = $student->student_id;
        $actor = auth()->user();

        $student->user?->delete();
        $student->delete();

        if ($actor) {
            $this->authService->logActivity(
                $actor,
                ActivityLogService::ACTION_STUDENT_DELETED,
                "Student deleted ({$studentId}).",
                ['model_type' => Student::class, 'model_id' => $student->id, 'old_values' => ['name' => $name]]
            );
        }

        return response()->json(['message' => 'Student deleted successfully.']);
    }

    public function grades(Request $request, Student $student): JsonResponse
    {
        if ($response = $this->denyUnlessCanViewStudent($request->user(), $student)) {
            return $response;
        }

        $query = $student->grades()->with(['course', 'teacher.user']);

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->query('course_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        $grades = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($grades);
    }

    public function attendance(Request $request, Student $student): JsonResponse
    {
        if ($response = $this->denyUnlessCanViewStudent($request->user(), $student)) {
            return $response;
        }

        $absences = $student->absences()
            ->with(['course', 'teacher.user'])
            ->latest('date')
            ->paginate($request->integer('per_page', 15));

        return response()->json($absences);
    }

    /**
     * @return array<string, string>
     */
    protected function studentValidationMessages(): array
    {
        return [
            'student_id.unique' => 'This student ID is already assigned to another student. Leave the field empty when creating a student to auto-generate one.',
        ];
    }
}
