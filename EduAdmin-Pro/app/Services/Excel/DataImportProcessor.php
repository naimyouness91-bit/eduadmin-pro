<?php

namespace App\Services\Excel;

use App\Models\Course;
use App\Models\DataImportJob;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\StudentService;
use App\Services\TeacherService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DataImportProcessor
{
    public function __construct(
        protected ExcelWorkbookService $excel,
        protected StudentService $studentService,
        protected TeacherService $teacherService
    ) {}

    public function process(DataImportJob $job, UploadedFile $file): DataImportJob
    {
        $type = $job->type;
        $definition = ImportDefinitionRegistry::definitions()[$type] ?? null;

        if (! $definition) {
            return $this->failJob($job, 'Unknown import type.');
        }

        try {
            $parsed = $this->excel->parseUpload($file);
        } catch (\Throwable $e) {
            return $this->failJob($job, 'Invalid or corrupted file: '.$e->getMessage());
        }

        $missing = $this->excel->missingRequiredHeaders($definition['required_headers'], $parsed['headers']);

        if (! empty($missing)) {
            return $this->failJob($job, 'Missing required columns: '.implode(', ', $missing));
        }

        if (empty($parsed['rows'])) {
            return $this->failJob($job, 'The file contains no data rows.');
        }

        if (count($parsed['rows']) > 5000) {
            return $this->failJob($job, 'Maximum 5000 rows per import.');
        }

        $job->update([
            'status' => DataImportJob::STATUS_PROCESSING,
            'total_rows' => count($parsed['rows']),
            'processed_rows' => 0,
            'errors' => [],
        ]);

        $errors = [];
        $success = 0;
        $skipped = 0;
        $failed = 0;
        $seenKeys = [];

        foreach ($parsed['rows'] as $index => $row) {
            $rowNumber = $index + 2;
            $result = match ($type) {
                'students' => $this->importStudentRow($row, $rowNumber, $seenKeys),
                'teachers' => $this->importTeacherRow($row, $rowNumber, $seenKeys),
                'courses' => $this->importCourseRow($row, $rowNumber, $seenKeys),
                default => ['status' => 'failed', 'message' => 'Unsupported type'],
            };

            if ($result['status'] === 'success') {
                $success++;
            } elseif ($result['status'] === 'skipped') {
                $skipped++;
                $errors[] = ['row' => $rowNumber, 'message' => $result['message']];
            } else {
                $failed++;
                $errors[] = ['row' => $rowNumber, 'message' => $result['message']];
            }

            if (($index + 1) % 10 === 0 || $index === count($parsed['rows']) - 1) {
                $job->update([
                    'processed_rows' => $index + 1,
                    'success_count' => $success,
                    'skipped_count' => $skipped,
                    'failed_count' => $failed,
                    'errors' => array_slice($errors, 0, 200),
                ]);
            }
        }

        $job->update([
            'status' => DataImportJob::STATUS_COMPLETED,
            'processed_rows' => count($parsed['rows']),
            'success_count' => $success,
            'skipped_count' => $skipped,
            'failed_count' => $failed,
            'errors' => array_slice($errors, 0, 200),
            'message' => "Import finished: {$success} created, {$skipped} skipped, {$failed} failed.",
        ]);

        return $job->fresh();
    }

    /**
     * @param  array<string, string|null>  $row
     * @param  array<string, bool>  $seenKeys
     * @return array{status: string, message?: string}
     */
    protected function importStudentRow(array $row, int $rowNumber, array &$seenKeys): array
    {
        $email = strtolower(trim($row['email'] ?? ''));
        $studentCode = trim($row['student_id'] ?? '');

        if (isset($seenKeys['email:'.$email])) {
            return ['status' => 'skipped', 'message' => "Duplicate email in file (row {$rowNumber})."];
        }

        if ($studentCode !== '' && isset($seenKeys['student_id:'.$studentCode])) {
            return ['status' => 'skipped', 'message' => "Duplicate student_id in file (row {$rowNumber})."];
        }

        $validator = Validator::make($row, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'student_id' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('students', 'student_id')->whereNull('deleted_at'),
            ],
            'grade_level' => ['nullable', 'string', 'max:50'],
            'section' => ['nullable', 'string', 'max:50'],
            'enrollment_status' => ['nullable', 'string', 'max:50'],
            'enrollment_date' => ['nullable', 'date'],
            'guardian_email' => ['nullable', 'email'],
        ]);

        if ($validator->fails()) {
            return ['status' => 'failed', 'message' => implode(' ', $validator->errors()->all())];
        }

        if (User::where('email', $email)->exists()) {
            return ['status' => 'skipped', 'message' => 'Email already exists in database.'];
        }

        if ($studentCode !== '' && Student::where('student_id', $studentCode)->whereNull('deleted_at')->exists()) {
            return ['status' => 'skipped', 'message' => 'Student ID already exists in database.'];
        }

        try {
            $this->studentService->createStudent([
                'name' => $row['name'],
                'email' => $email,
                'password' => $row['password'],
                'student_id' => $studentCode ?: null,
                'grade_level' => $row['grade_level'] ?? null,
                'section' => $row['section'] ?? null,
                'enrollment_status' => $row['enrollment_status'] ?? 'active',
                'enrollment_date' => $row['enrollment_date'] ?? null,
                'guardian_name' => $row['guardian_name'] ?? null,
                'guardian_phone' => $row['guardian_phone'] ?? null,
                'guardian_email' => $row['guardian_email'] ?? null,
                'phone' => $row['phone'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'message' => $e->getMessage()];
        }

        $seenKeys['email:'.$email] = true;
        if ($studentCode !== '') {
            $seenKeys['student_id:'.$studentCode] = true;
        }

        return ['status' => 'success'];
    }

    /**
     * @param  array<string, string|null>  $row
     * @param  array<string, bool>  $seenKeys
     * @return array{status: string, message?: string}
     */
    protected function importTeacherRow(array $row, int $rowNumber, array &$seenKeys): array
    {
        $email = strtolower(trim($row['email'] ?? ''));
        $teacherCode = trim($row['teacher_id'] ?? '');

        if (isset($seenKeys['email:'.$email])) {
            return ['status' => 'skipped', 'message' => "Duplicate email in file (row {$rowNumber})."];
        }

        if ($teacherCode !== '' && isset($seenKeys['teacher_id:'.$teacherCode])) {
            return ['status' => 'skipped', 'message' => "Duplicate teacher_id in file (row {$rowNumber})."];
        }

        $validator = Validator::make($row, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'teacher_id' => ['nullable', 'string', 'max:50', Rule::unique('teachers', 'teacher_id')],
            'experience_years' => ['nullable', 'integer', 'min:0'],
            'joining_date' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return ['status' => 'failed', 'message' => implode(' ', $validator->errors()->all())];
        }

        if (User::where('email', $email)->exists()) {
            return ['status' => 'skipped', 'message' => 'Email already exists in database.'];
        }

        if ($teacherCode !== '' && Teacher::where('teacher_id', $teacherCode)->exists()) {
            return ['status' => 'skipped', 'message' => 'Teacher ID already exists in database.'];
        }

        try {
            $this->teacherService->createTeacher([
                'name' => $row['name'],
                'email' => $email,
                'password' => $row['password'],
                'teacher_id' => $teacherCode ?: null,
                'specialization' => $row['specialization'] ?? null,
                'department' => $row['department'] ?? null,
                'qualification' => $row['qualification'] ?? null,
                'experience_years' => isset($row['experience_years']) && $row['experience_years'] !== ''
                    ? (int) $row['experience_years'] : null,
                'employment_type' => $row['employment_type'] ?? null,
                'joining_date' => $row['joining_date'] ?? null,
                'phone' => $row['phone'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'message' => $e->getMessage()];
        }

        $seenKeys['email:'.$email] = true;
        if ($teacherCode !== '') {
            $seenKeys['teacher_id:'.$teacherCode] = true;
        }

        return ['status' => 'success'];
    }

    /**
     * @param  array<string, string|null>  $row
     * @param  array<string, bool>  $seenKeys
     * @return array{status: string, message?: string}
     */
    protected function importCourseRow(array $row, int $rowNumber, array &$seenKeys): array
    {
        $code = strtoupper(trim($row['code'] ?? ''));

        if ($code === '') {
            return ['status' => 'failed', 'message' => 'Course code is required.'];
        }

        if (isset($seenKeys['code:'.$code])) {
            return ['status' => 'skipped', 'message' => "Duplicate course code in file (row {$rowNumber})."];
        }

        $validator = Validator::make($row, [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', Rule::unique('courses', 'code')],
            'credits' => ['nullable', 'integer', 'min:1', 'max:20'],
            'max_students' => ['nullable', 'integer', 'min:1'],
        ]);

        if ($validator->fails()) {
            return ['status' => 'failed', 'message' => implode(' ', $validator->errors()->all())];
        }

        if (Course::where('code', $code)->exists()) {
            return ['status' => 'skipped', 'message' => 'Course code already exists in database.'];
        }

        $teacherId = null;
        $teacherEmail = strtolower(trim($row['teacher_email'] ?? ''));

        if ($teacherEmail !== '') {
            $teacher = Teacher::whereHas('user', fn ($q) => $q->where('email', $teacherEmail))->first();
            if (! $teacher) {
                return ['status' => 'failed', 'message' => "Teacher email not found: {$teacherEmail}"];
            }
            $teacherId = $teacher->id;
        }

        try {
            Course::create([
                'name' => $row['name'],
                'code' => $code,
                'description' => $row['description'] ?? null,
                'teacher_id' => $teacherId,
                'grade_level' => $row['grade_level'] ?? null,
                'credits' => isset($row['credits']) && $row['credits'] !== '' ? (int) $row['credits'] : 3,
                'status' => $row['status'] ?? 'active',
                'semester' => $row['semester'] ?? null,
                'academic_year' => $row['academic_year'] ?? null,
                'room' => $row['room'] ?? null,
                'max_students' => isset($row['max_students']) && $row['max_students'] !== ''
                    ? (int) $row['max_students'] : 30,
            ]);
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'message' => $e->getMessage()];
        }

        $seenKeys['code:'.$code] = true;

        return ['status' => 'success'];
    }

    protected function failJob(DataImportJob $job, string $message): DataImportJob
    {
        $job->update([
            'status' => DataImportJob::STATUS_FAILED,
            'message' => $message,
            'errors' => [['row' => 0, 'message' => $message]],
        ]);

        return $job->fresh();
    }
}
