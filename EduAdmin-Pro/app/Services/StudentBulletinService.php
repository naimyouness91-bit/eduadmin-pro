<?php

namespace App\Services;

use App\Models\Student;
use App\Models\StudentBulletin;
use App\Models\SystemSetting;
use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StudentBulletinService
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    public function recordFor(Student $student): StudentBulletin
    {
        return StudentBulletin::firstOrCreate(
            ['student_id' => $student->id],
            [
                'status' => StudentBulletin::STATUS_DRAFT,
                'academic_year' => SystemSetting::get('academic_year', now()->format('Y').'-'.(now()->year + 1)),
                'semester' => SystemSetting::get('current_semester', 'Current term'),
            ]
        );
    }

    public function isPublished(Student $student): bool
    {
        return $this->recordFor($student)->isPublished();
    }

    /**
     * @return array<string, mixed>
     */
    public function statusPayload(Student $student, User $user): array
    {
        $record = $this->recordFor($student);
        $isAdmin = $user->hasRole(['super_admin', 'admin']);

        return [
            'status' => $record->status,
            'academic_year' => $record->academic_year,
            'semester' => $record->semester,
            'generated_at' => $record->generated_at?->toIso8601String(),
            'published_at' => $record->published_at?->toIso8601String(),
            'is_published' => $record->isPublished(),
            'is_generated' => $record->isGenerated(),
            'can_preview' => $isAdmin || $record->isPublished(),
            'can_download' => $isAdmin || $record->isPublished(),
            'can_generate' => $isAdmin,
            'can_publish' => $isAdmin && $record->isGenerated() && ! $record->isPublished(),
        ];
    }

    public function markGenerated(Student $student, User $admin): StudentBulletin
    {
        $record = $this->recordFor($student);
        $record->fill([
            'status' => StudentBulletin::STATUS_GENERATED,
            'generated_at' => now(),
            'generated_by' => $admin->id,
            'academic_year' => SystemSetting::get('academic_year', $record->academic_year),
            'semester' => SystemSetting::get('current_semester', $record->semester),
        ]);
        $record->save();

        return $record->fresh();
    }

    public function markPublished(Student $student, User $admin): StudentBulletin
    {
        $record = $this->recordFor($student);

        if (! $record->isGenerated() && $record->status === StudentBulletin::STATUS_DRAFT) {
            $this->markGenerated($student, $admin);
            $record = $record->fresh();
        }

        $record->fill([
            'status' => StudentBulletin::STATUS_PUBLISHED,
            'published_at' => now(),
            'published_by' => $admin->id,
        ]);
        $record->save();

        return $record->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function buildViewData(Student $student): array
    {
        $report = $this->reportService->generateStudentReport($student);
        $studentId = $report['student']['student_id'] ?? 'STU-'.$student->id;
        $verifyToken = hash('sha256', $student->id.'|'.$studentId.'|'.now()->toDateString());

        $writer = new Writer(new ImageRenderer(new RendererStyle(140), new SvgImageBackEnd()));
        $qrSvg = $writer->writeString(
            'EduAdmin Pro Bulletin'."\n".
            'ID: '.$studentId."\n".
            'Verify: '.substr($verifyToken, 0, 12)."\n".
            'Date: '.now()->toDateString()
        );

        $branding = $this->schoolBranding();
        $summary = $report['summary'] ?? [];

        return [
            'report' => $report,
            'display' => [
                'student_name' => $report['user']['name'] ?? 'Student',
                'student_id' => $studentId,
                'email' => $report['user']['email'] ?? '—',
                'grade_level' => $report['student']['grade_level'] ?? '—',
                'section' => $report['student']['section'] ?? '—',
                'enrollment_status' => ucfirst($report['student']['enrollment_status'] ?? 'active'),
                'guardian_name' => $report['student']['guardian_name'] ?? '—',
                'average_grade' => $this->formatPercent($summary['average_grade'] ?? null),
                'attendance_rate' => $this->formatPercent(
                    $summary['attendance_rate'] ?? $summary['global_attendance_rate'] ?? null,
                    '100%'
                ),
                'courses_enrolled' => (string) ($summary['courses_enrolled'] ?? 0),
                'academic_year' => SystemSetting::get('academic_year', now()->format('Y').'-'.(now()->year + 1)),
                'semester' => SystemSetting::get('current_semester', 'Current term'),
            ],
            'grades_flat' => $this->flattenGrades($report),
            'qrSvg' => $qrSvg,
            'verifyCode' => $verifyToken,
            'verifyShort' => strtoupper(substr($verifyToken, 0, 16)),
            'schoolName' => $branding['name'],
            'schoolAddress' => $branding['address'],
            'schoolPhone' => $branding['phone'],
            'schoolEmail' => $branding['email'],
            'logoHtml' => $branding['logo_html'],
            'generatedAt' => now()->format('F j, Y \a\t g:i A'),
        ];
    }

    /**
     * JSON payload for in-app bulletin preview (grades, attendance, summary).
     *
     * @return array<string, mixed>
     */
    public function previewPayload(Student $student): array
    {
        $view = $this->buildViewData($student);
        $report = $view['report'];

        $courses = [];
        foreach ($report['grades_by_course'] ?? [] as $group) {
            $courses[] = [
                'course_id' => $group['course_id'] ?? null,
                'name' => $group['course']['name'] ?? 'Course',
                'average' => $group['average'] ?? null,
                'grade_count' => count($group['grades'] ?? []),
            ];
        }

        $attendance = [];
        foreach ($report['attendance_by_course'] ?? [] as $row) {
            $attendance[] = [
                'course' => $row['course']['name'] ?? 'Course',
                'rate' => $row['rate'] ?? null,
                'present' => $row['present'] ?? 0,
                'absent' => $row['absent'] ?? 0,
                'late' => $row['late'] ?? 0,
                'total' => $row['total'] ?? 0,
            ];
        }

        $gradesFlat = $view['grades_flat'];
        $summary = $report['summary'] ?? [];

        return [
            'summary' => [
                'average_grade' => $summary['average_grade'] ?? null,
                'attendance_rate' => $summary['global_attendance_rate']
                    ?? $summary['attendance_rate']
                    ?? null,
                'courses_enrolled' => (int) ($summary['courses_enrolled'] ?? 0),
                'total_grades' => (int) ($summary['total_grades'] ?? 0),
            ],
            'display' => $view['display'],
            'courses' => $courses,
            'grades' => $gradesFlat,
            'attendance_by_course' => $attendance,
            'has_grades' => count($gradesFlat) > 0,
        ];
    }

    public function renderHtml(Student $student): string
    {
        return view('reports.bulletin', $this->buildViewData($student))->render();
    }

    public function pdfDownload(Student $student): \Illuminate\Http\Response
    {
        $html = $this->renderHtml($student);
        $studentId = $student->student_id ?? 'student-'.$student->id;
        $filename = 'bulletin-'.Str::slug($studentId).'.pdf';

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption(['isRemoteEnabled' => true, 'defaultFont' => 'DejaVu Sans']);

        return $pdf->download($filename);
    }

    public function pdfInline(Student $student): \Illuminate\Http\Response
    {
        $html = $this->renderHtml($student);
        $studentId = $student->student_id ?? 'student-'.$student->id;
        $filename = 'bulletin-'.Str::slug($studentId).'.pdf';

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption(['isRemoteEnabled' => true, 'defaultFont' => 'DejaVu Sans']);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /**
     * @return array{name: string, address: string, phone: string, email: string, logo_html: string}
     */
    protected function schoolBranding(): array
    {
        $name = SystemSetting::get('school_name', 'EduAdmin Pro Academy');

        return [
            'name' => $name,
            'address' => SystemSetting::get('school_address', ''),
            'phone' => SystemSetting::get('school_phone', ''),
            'email' => SystemSetting::get('school_email', ''),
            'logo_html' => $this->resolveLogoHtml($name),
        ];
    }

    protected function resolveLogoHtml(string $schoolName): string
    {
        $path = SystemSetting::get('school_logo', '');

        if ($path && Storage::disk('public')->exists($path)) {
            $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';
            $data = base64_encode(Storage::disk('public')->get($path));

            return '<img src="data:'.$mime.';base64,'.$data.'" alt="School logo" style="width:64px;height:64px;object-fit:contain;border-radius:8px;" />';
        }

        $initial = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $schoolName) ?: 'E', 0, 1));

        return '<div style="width:64px;height:64px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:28px;font-weight:bold;text-align:center;line-height:64px;">'
            .$initial
            .'</div>';
    }

    protected function formatPercent(mixed $value, string $fallback = 'N/A'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        return round((float) $value, 1).'%';
    }

    /**
     * @param  array<string, mixed>  $report
     * @return array<int, array<string, mixed>>
     */
    protected function flattenGrades(array $report): array
    {
        $rows = [];

        foreach ($report['grades_by_course'] ?? [] as $group) {
            $courseName = $group['course']['name'] ?? 'Course';

            foreach ($group['grades'] ?? [] as $grade) {
                $score = $grade->score ?? null;
                $max = $grade->max_score ?? 100;
                $pct = ($score !== null && $max > 0) ? round(((float) $score / (float) $max) * 100, 1) : null;

                $rows[] = [
                    'course' => $courseName,
                    'title' => $grade->title ?? 'Assessment',
                    'type' => ucfirst($grade->type ?? 'exam'),
                    'score' => $score !== null ? $score.' / '.$max : '—',
                    'percentage' => $pct !== null ? $pct.'%' : '—',
                    'date' => $grade->graded_at?->format('M j, Y') ?? ($grade->created_at?->format('M j, Y') ?? '—'),
                ];
            }
        }

        return $rows;
    }
}
