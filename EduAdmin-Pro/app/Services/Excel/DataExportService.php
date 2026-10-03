<?php

namespace App\Services\Excel;

use App\Models\Absence;
use App\Models\Grade;
use App\Models\Student;
use App\Models\Teacher;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataExportService
{
    public function __construct(
        protected ExcelWorkbookService $excel
    ) {}

    public function export(string $type): StreamedResponse
    {
        $definition = ImportDefinitionRegistry::exportDefinitions()[$type] ?? null;

        if (! $definition) {
            abort(404, 'Unknown export type.');
        }

        $rows = match ($type) {
            'students' => $this->exportStudents(),
            'teachers' => $this->exportTeachers(),
            'grades' => $this->exportGrades(),
            'attendance' => $this->exportAttendance(),
            default => [],
        };

        $filename = $type.'_export_'.now()->format('Y-m-d_His').'.xlsx';

        return $this->excel->downloadSpreadsheet($definition['headers'], $rows, $filename);
    }

    public function template(string $type): StreamedResponse
    {
        $definition = ImportDefinitionRegistry::definitions()[$type] ?? null;

        if (! $definition) {
            abort(404, 'Unknown template type.');
        }

        $headers = array_map(
            fn ($h) => in_array($h, $definition['required_headers'], true) ? $h.' *' : $h,
            array_merge($definition['required_headers'], $definition['optional_headers'])
        );

        $example = [];
        foreach (array_merge($definition['required_headers'], $definition['optional_headers']) as $key) {
            $example[] = $definition['example'][$key] ?? '';
        }

        $filename = $type.'_import_template.xlsx';

        return $this->excel->downloadSpreadsheet($headers, [$example], $filename);
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    protected function exportStudents(): array
    {
        return Student::query()
            ->with('user')
            ->whereHas('user', fn ($q) => $q->whereNull('deleted_at'))
            ->orderBy('student_id')
            ->cursor()
            ->map(fn (Student $s) => [
                $s->student_id,
                $s->user?->name,
                $s->user?->email,
                $s->user?->phone,
                $s->grade_level,
                $s->section,
                $s->enrollment_status,
                $s->enrollment_date?->format('Y-m-d'),
                $s->guardian_name,
                $s->guardian_phone,
                $s->guardian_email,
            ])
            ->all();
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    protected function exportTeachers(): array
    {
        return Teacher::query()
            ->with('user')
            ->orderBy('teacher_id')
            ->cursor()
            ->map(fn (Teacher $t) => [
                $t->teacher_id,
                $t->user?->name,
                $t->user?->email,
                $t->user?->phone,
                $t->department,
                $t->specialization,
                $t->qualification,
                $t->experience_years,
                $t->employment_type,
                $t->joining_date?->format('Y-m-d'),
            ])
            ->all();
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    protected function exportGrades(): array
    {
        return Grade::query()
            ->with(['student.user', 'course'])
            ->orderByDesc('graded_at')
            ->limit(10000)
            ->get()
            ->map(function (Grade $g) {
                $max = (float) $g->max_score;
                $pct = $max > 0 && $g->score !== null
                    ? round(((float) $g->score / $max) * 100, 1)
                    : null;

                return [
                    $g->student?->student_id,
                    $g->student?->user?->name,
                    $g->course?->code,
                    $g->course?->name,
                    $g->title,
                    $g->type,
                    $g->score,
                    $g->max_score,
                    $pct,
                    $g->graded_at?->format('Y-m-d'),
                    $g->semester,
                    $g->academic_year,
                    $g->feedback,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    protected function exportAttendance(): array
    {
        return Absence::query()
            ->with(['student.user', 'course'])
            ->orderByDesc('date')
            ->limit(10000)
            ->get()
            ->map(fn (Absence $a) => [
                $a->student?->student_id,
                $a->student?->user?->name,
                $a->course?->code,
                $a->course?->name,
                $a->date?->format('Y-m-d'),
                $a->status,
                $a->method,
                $a->notes,
            ])
            ->all();
    }
}
