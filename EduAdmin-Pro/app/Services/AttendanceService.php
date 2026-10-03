<?php

namespace App\Services;

use App\Models\Absence;
use App\Models\Course;
use App\Models\Student;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AttendanceService
{
    protected const CACHE_PREFIX = 'attendance_qr:';

    protected const CACHE_TTL_MINUTES = 15;

    public function bulkMark(int $courseId, string $date, array $attendance, ?int $teacherId = null): void
    {
        DB::transaction(function () use ($courseId, $date, $attendance, $teacherId) {
            foreach ($attendance as $row) {
                Absence::updateOrCreate(
                    [
                        'student_id' => $row['student_id'],
                        'course_id' => $courseId,
                        'date' => $date,
                    ],
                    [
                        'status' => $row['status'] ?? 'absent',
                        'teacher_id' => $teacherId,
                        'method' => $row['method'] ?? 'manual',
                        'notes' => $row['notes'] ?? null,
                    ]
                );
            }
        });
    }

    public function generateQrCode(int $courseId, string $date): array
    {
        $course = Course::findOrFail($courseId);
        $token = Str::random(32);
        $expiresAt = now()->addMinutes(self::CACHE_TTL_MINUTES);

        Cache::put(self::CACHE_PREFIX.$token, [
            'course_id' => $course->id,
            'date' => $date,
        ], $expiresAt);

        $payload = json_encode([
            'token' => $token,
            'course_id' => $course->id,
            'date' => $date,
        ], JSON_THROW_ON_ERROR);

        $svg = (new Writer(
            new ImageRenderer(
                new RendererStyle(300),
                new SvgImageBackEnd
            )
        ))->writeString($payload);

        return [
            'token' => $token,
            'image' => 'data:image/svg+xml;base64,'.base64_encode($svg),
            'expires_at' => $expiresAt->toIso8601String(),
            'course' => $course->only(['id', 'name', 'code']),
        ];
    }

    public function markByQr(string $token, int $studentId): array
    {
        $cacheKey = self::CACHE_PREFIX.$token;
        $session = Cache::get($cacheKey);

        if (! $session) {
            throw new InvalidArgumentException('Invalid or expired attendance QR token.');
        }

        $course = Course::findOrFail($session['course_id']);
        $student = Student::findOrFail($studentId);

        if (! $course->students()->where('students.id', $student->id)->exists()) {
            throw new InvalidArgumentException('Student is not enrolled in this course.');
        }

        return DB::transaction(function () use ($course, $student, $session, $studentId) {
            $absence = Absence::updateOrCreate(
                [
                    'student_id' => $studentId,
                    'course_id' => $course->id,
                    'date' => $session['date'],
                ],
                [
                    'status' => 'present',
                    'method' => 'qr',
                    'teacher_id' => $course->teacher_id,
                    'notes' => null,
                ]
            );

            return [
                'success' => true,
                'message' => 'Attendance marked as present.',
                'student_id' => $studentId,
                'course_id' => $course->id,
                'date' => $session['date'],
                'attendance' => $absence->fresh(['student.user', 'course']),
            ];
        });
    }

    public function getReport(int $courseId, string $from, string $to): array
    {
        $course = Course::with(['students.user'])->findOrFail($courseId);
        $fromDate = Carbon::parse($from)->toDateString();
        $toDate = Carbon::parse($to)->toDateString();

        $absences = Absence::query()
            ->where('course_id', $courseId)
            ->whereBetween('date', [$fromDate, $toDate])
            ->get();

        $byStudent = $course->students->map(function (Student $student) use ($absences) {
            $records = $absences->where('student_id', $student->id);

            $total = $records->count();
            $present = $records->where('status', 'present')->count();
            $absent = $records->where('status', 'absent')->count();
            $late = $records->where('status', 'late')->count();
            $excused = $records->where('status', 'excused')->count();

            $rate = $total > 0
                ? round((($present + $excused) / $total) * 100, 2)
                : 100.0;

            return [
                'student' => $student,
                'total' => $total,
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'excused' => $excused,
                'rate' => $rate,
            ];
        })->values()->all();

        return [
            'course_id' => $courseId,
            'course' => $course->only(['id', 'name', 'code']),
            'from' => $fromDate,
            'to' => $toDate,
            'by_student' => $byStudent,
        ];
    }
}
