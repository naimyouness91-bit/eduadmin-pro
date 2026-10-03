<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FreshDeploymentService
{
    public const SUPER_ADMIN_EMAIL = 'superadmin@eduadmin.com';

    /**
     * Tables cleared in dependency-safe order (children first).
     *
     * @var array<int, string>
     */
    protected array $purgeTables = [
        'course_ai_quiz_attempt_answers',
        'course_ai_quiz_attempts',
        'course_ai_quiz_questions',
        'course_ai_quizzes',
        'course_quiz_documents',
        'ai_messages',
        'ai_conversations',
        'meeting_resources',
        'meeting_messages',
        'meeting_attendance_logs',
        'meeting_participants',
        'virtual_meetings',
        'group_messages',
        'group_members',
        'groups',
        'login_events',
        'data_import_jobs',
        'system_backups',
        'activity_logs',
        'file_uploads',
        'payments',
        'submissions',
        'assignments',
        'grades',
        'absences',
        'schedules',
        'course_student',
        'courses',
        'messages',
        'notifications',
        'events',
        'announcements',
        'parent_student',
        'students',
        'teachers',
        'parents',
    ];

    /**
     * Operational data cleared while preserving courses, schedules, and enrollments structure.
     *
     * @var array<int, string>
     */
    protected array $purgeTablesPreservingCourses = [
        'course_ai_quiz_attempt_answers',
        'course_ai_quiz_attempts',
        'course_ai_quiz_questions',
        'course_ai_quizzes',
        'course_quiz_documents',
        'ai_messages',
        'ai_conversations',
        'meeting_resources',
        'meeting_messages',
        'meeting_attendance_logs',
        'meeting_participants',
        'virtual_meetings',
        'group_messages',
        'group_members',
        'groups',
        'login_events',
        'data_import_jobs',
        'system_backups',
        'activity_logs',
        'file_uploads',
        'payments',
        'submissions',
        'assignments',
        'grades',
        'absences',
        'timetable_entries',
        'timetables',
        'class_sections',
        'schedules',
        'messages',
        'notifications',
        'events',
        'announcements',
        'parent_student',
        'students',
        'teachers',
        'parents',
    ];

    /**
     * @return array{super_admin_email: string, users_remaining: int, tables_cleared: array<int, string>}
     */
    public function purgeDemoData(bool $preserveCourses = false): array
    {
        $superAdmin = User::withTrashed()
            ->where('email', self::SUPER_ADMIN_EMAIL)
            ->where('role', 'super_admin')
            ->first();

        if (! $superAdmin) {
            throw new \RuntimeException(
                'Super Admin account not found. Run: php artisan db:seed --class=UserSeeder'
            );
        }

        $tables = $preserveCourses ? $this->purgeTablesPreservingCourses : $this->purgeTables;

        Schema::disableForeignKeyConstraints();

        try {
            if ($preserveCourses && Schema::hasTable('course_student')) {
                DB::table('course_student')->truncate();
            }

            if ($preserveCourses && Schema::hasTable('courses')) {
                DB::table('courses')->update(['teacher_id' => null]);
            }

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->truncate();
                }
            }

            if (Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->where('tokenable_id', '!=', $superAdmin->id)
                    ->delete();
            }

            User::withTrashed()
                ->where('id', '!=', $superAdmin->id)
                ->forceDelete();

            if ($superAdmin->trashed()) {
                $superAdmin->restore();
            }

            $superAdmin->update([
                'is_active' => true,
                'email_verified_at' => $superAdmin->email_verified_at ?? now(),
            ]);
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return [
            'super_admin_email' => self::SUPER_ADMIN_EMAIL,
            'users_remaining' => User::count(),
            'courses_preserved' => $preserveCourses ? Course::count() : 0,
            'tables_cleared' => array_values(array_filter(
                $tables,
                fn (string $table) => Schema::hasTable($table)
            )),
        ];
    }
}
