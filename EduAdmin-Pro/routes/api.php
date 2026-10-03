<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\ImportExportController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\ParentPortalController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\TimetableController;
use App\Http\Controllers\Api\TimetableRescheduleController;
use App\Http\Controllers\Api\SecurityCenterController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\AiExamPrepController;
use App\Http\Controllers\Api\AiStudyAssistantController;
use App\Http\Controllers\Api\CourseAiQuizController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\VirtualMeetingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes publiques
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

/*
|--------------------------------------------------------------------------
| Routes authentifiées
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'activity.log'])->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
        Route::match(['put', 'post'], '/profile', [AuthController::class, 'updateProfile']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/2fa/enable', [AuthController::class, 'enableTwoFactor']);
        Route::post('/2fa/confirm', [AuthController::class, 'confirmTwoFactor']);
        Route::post('/2fa/disable', [AuthController::class, 'disableTwoFactor']);
    });

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Global search
    Route::get('/search', [SearchController::class, 'index']);

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
    });

    // Events calendar
    Route::get('/events', [EventController::class, 'index']);

    // Parent portal (parent role only — child access enforced via ParentChildPolicy)
    Route::prefix('parent')->middleware('parent')->group(function () {
        Route::get('/children', [ParentPortalController::class, 'children']);
        Route::get('/children/{student}', [ParentPortalController::class, 'showChild']);
        Route::get('/children/{student}/grades', [ParentPortalController::class, 'childGrades']);
        Route::get('/children/{student}/grades/stats', [ParentPortalController::class, 'childGradeStats']);
        Route::get('/children/{student}/attendance', [ParentPortalController::class, 'childAttendance']);
        Route::get('/children/{student}/assignments', [ParentPortalController::class, 'childAssignments']);
        Route::get('/children/{student}/schedule', [ParentPortalController::class, 'childSchedule']);
    });

    // Student academic bulletin (workflow: generate → publish → view)
    Route::get('/students/{student}/bulletin/status', [ReportController::class, 'bulletinStatus']);
    Route::get('/students/{student}/bulletin/preview', [ReportController::class, 'bulletinPreview']);
    Route::get('/students/{student}/bulletin', [ReportController::class, 'studentBulletin']);
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('/bulletins/status', [ReportController::class, 'batchBulletinStatus']);
        Route::post('/students/{student}/bulletin/generate', [ReportController::class, 'generateBulletin']);
        Route::post('/students/{student}/bulletin/publish', [ReportController::class, 'publishBulletin']);
    });

    // Routes partagées (plusieurs rôles)
    Route::get('/students/{student}/grades', [StudentController::class, 'grades']);
    Route::get('/students/{student}/attendance', [StudentController::class, 'attendance']);
    Route::get('/teachers/{teacher}/courses', [TeacherController::class, 'courses']);

    // Courses — read for all authenticated roles
    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);

    // Courses — write (admin only)
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/courses', [CourseController::class, 'store']);
        Route::put('/courses/{course}', [CourseController::class, 'update']);
        Route::patch('/courses/{course}', [CourseController::class, 'update']);
        Route::delete('/courses/{course}', [CourseController::class, 'destroy']);
        Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll']);
        Route::post('/courses/{course}/unenroll', [CourseController::class, 'unenroll']);
    });

    Route::get('/courses/{course}/students', [CourseController::class, 'students'])
        ->middleware('role:super_admin,admin,teacher');

    // Attendance
    Route::prefix('attendance')->group(function () {
        Route::get('/', [AttendanceController::class, 'index']);
        Route::post('/qr/scan', [AttendanceController::class, 'scanQr']);

        Route::middleware('role:super_admin,admin,teacher')->group(function () {
            Route::post('/mark', [AttendanceController::class, 'mark']);
            Route::post('/bulk', [AttendanceController::class, 'bulk']);
            Route::post('/qr/generate', [AttendanceController::class, 'generateQr']);
            Route::get('/report', [AttendanceController::class, 'report']);
        });
    });

    // Virtual meetings (Jitsi)
    Route::prefix('meetings')->group(function () {
        Route::get('/calendar', [VirtualMeetingController::class, 'calendar']);
        Route::get('/', [VirtualMeetingController::class, 'index']);
        Route::post('/', [VirtualMeetingController::class, 'store']);

        Route::get('/{meeting}', [VirtualMeetingController::class, 'show']);
        Route::put('/{meeting}', [VirtualMeetingController::class, 'update']);
        Route::delete('/{meeting}', [VirtualMeetingController::class, 'destroy']);

        Route::post('/{meeting}/join', [VirtualMeetingController::class, 'join']);
        Route::post('/{meeting}/leave', [VirtualMeetingController::class, 'leave']);
        Route::get('/{meeting}/participants', [VirtualMeetingController::class, 'participants']);
        Route::post('/{meeting}/invite', [VirtualMeetingController::class, 'invite']);
        Route::get('/{meeting}/attendance', [VirtualMeetingController::class, 'attendance']);

        Route::get('/{meeting}/messages', [VirtualMeetingController::class, 'messages']);
        Route::post('/{meeting}/messages', [VirtualMeetingController::class, 'sendMessage']);
        Route::post('/{meeting}/raise-hand', [VirtualMeetingController::class, 'raiseHand']);

        Route::get('/{meeting}/resources', [VirtualMeetingController::class, 'resources']);
        Route::post('/{meeting}/resources', [VirtualMeetingController::class, 'uploadResource']);
        Route::get('/{meeting}/resources/{resource}/download', [VirtualMeetingController::class, 'downloadResource']);
    });

    // Groups
    Route::prefix('groups')->group(function () {
        Route::get('/presets', [GroupController::class, 'presets']);
        Route::get('/teacher-presets', [GroupController::class, 'teacherPresets']);
        Route::get('/', [GroupController::class, 'index']);
        Route::post('/', [GroupController::class, 'store']);
        Route::post('/{group}/refresh-audience', [GroupController::class, 'refreshAudience']);
        Route::get('/{group}', [GroupController::class, 'show']);
        Route::put('/{group}', [GroupController::class, 'update']);
        Route::delete('/{group}', [GroupController::class, 'destroy']);

        Route::get('/{group}/members', [GroupController::class, 'members']);
        Route::get('/{group}/eligible-students', [GroupController::class, 'eligibleStudents']);
        Route::post('/{group}/members', [GroupController::class, 'addMembers']);
        Route::delete('/{group}/members/{user}', [GroupController::class, 'removeMember']);

        Route::get('/{group}/messages', [GroupController::class, 'messages']);
        Route::post('/{group}/messages', [GroupController::class, 'sendMessage']);
        Route::post('/{group}/discussions', [GroupController::class, 'createDiscussion']);
        Route::post('/{group}/announcements', [GroupController::class, 'postAnnouncement']);
        Route::post('/{group}/meetings', [GroupController::class, 'scheduleMeeting']);
        Route::post('/{group}/sessions', [GroupController::class, 'scheduleSession']);
        Route::post('/{group}/assignments', [GroupController::class, 'shareAssignment']);

        Route::get('/{group}/files', [GroupController::class, 'files']);
        Route::post('/{group}/files', [GroupController::class, 'uploadFile']);
        Route::get('/{group}/files/{message}/download', [GroupController::class, 'downloadFile']);
    });

    // Messages
    Route::prefix('messages')->group(function () {
        Route::get('/conversations', [MessageController::class, 'conversations']);
        Route::get('/unread-count', [MessageController::class, 'unreadCount']);
        Route::get('/{user}', [MessageController::class, 'messages']);
        Route::post('/', [MessageController::class, 'send']);
    });

    // Schedules (legacy course slots) — read for all; write admin only
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/schedules', [ScheduleController::class, 'store']);
        Route::put('/schedules/{schedule}', [ScheduleController::class, 'update']);
        Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);
    });

    // Global class timetables (Moroccan grid: Mon–Sat, standard periods)
    Route::get('/timetables/meta', [TimetableController::class, 'meta']);
    Route::get('/timetables/mine', [TimetableController::class, 'mine']);
    Route::get('/timetables/{timetable}/export', [TimetableController::class, 'export']);
    Route::get('/timetables/{timetable}', [TimetableController::class, 'show']);

    Route::middleware('role:teacher')->group(function () {
        Route::get('/timetable-entries/upcoming', [TimetableRescheduleController::class, 'upcomingSessions']);
        Route::get('/timetable-entries/{entry}/available-slots', [TimetableRescheduleController::class, 'availableSlots']);
        Route::post('/timetable-entries/{entry}/reschedule-requests', [TimetableRescheduleController::class, 'store']);
        Route::get('/timetable-reschedule-requests/mine', [TimetableRescheduleController::class, 'mine']);
        Route::delete('/timetable-reschedule-requests/{rescheduleRequest}', [TimetableRescheduleController::class, 'cancel']);
    });

    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('/timetables', [TimetableController::class, 'index']);
        Route::get('/timetables-overview', [TimetableController::class, 'overview']);
        Route::post('/timetables/auto-generate', [TimetableController::class, 'autoGenerate']);
        Route::post('/timetables', [TimetableController::class, 'store']);
        Route::put('/timetables/{timetable}', [TimetableController::class, 'update']);
        Route::delete('/timetables/{timetable}', [TimetableController::class, 'destroy']);
        Route::post('/timetables/{timetable}/duplicate', [TimetableController::class, 'duplicate']);
        Route::post('/timetables/{timetable}/publish', [TimetableController::class, 'publish']);
        Route::get('/timetables/{timetable}/conflicts', [TimetableController::class, 'conflicts']);
        Route::post('/timetables/{timetable}/entries', [TimetableController::class, 'upsertEntry']);
        Route::post('/class-sections', [TimetableController::class, 'storeClassSection']);
        Route::get('/class-sections', [TimetableController::class, 'classSections']);
        Route::get('/class-sections/{classSection}/courses', [TimetableController::class, 'sectionCourses']);
        Route::put('/timetable-entries/{entry}/move', [TimetableController::class, 'moveEntry']);
        Route::delete('/timetable-entries/{entry}', [TimetableController::class, 'destroyEntry']);
        Route::get('/timetable-reschedule-requests', [TimetableRescheduleController::class, 'index']);
        Route::post('/timetable-reschedule-requests/{rescheduleRequest}/approve', [TimetableRescheduleController::class, 'approve']);
        Route::post('/timetable-reschedule-requests/{rescheduleRequest}/reject', [TimetableRescheduleController::class, 'reject']);
    });

    // Announcements (lecture — tous les rôles)
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show']);

    // Grades read (students see own grades; teachers/admins see all)
    Route::get('/grades', [GradeController::class, 'index']);
    Route::get('/grades-stats', [GradeController::class, 'stats']);

    // Assignments & submissions
    Route::get('/assignments', [AssignmentController::class, 'index']);
    Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
    Route::get('/assignments/{assignment}/attachment', [AssignmentController::class, 'downloadAttachment']);

    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::post('/assignments', [AssignmentController::class, 'store']);
        Route::match(['put', 'patch'], '/assignments/{assignment}', [AssignmentController::class, 'update']);
        Route::delete('/assignments/{assignment}', [AssignmentController::class, 'destroy']);
        Route::get('/assignments/{assignment}/submissions', [SubmissionController::class, 'index']);
        Route::put('/submissions/{submission}/review', [SubmissionController::class, 'review']);
    });

    Route::middleware('role:student')->group(function () {
        Route::post('/assignments/{assignment}/submissions', [SubmissionController::class, 'store']);
    });

    // AI Quiz from course files
    Route::prefix('ai-quiz')->group(function () {
        Route::get('/options', [CourseAiQuizController::class, 'options']);

        Route::middleware('role:teacher')->group(function () {
            Route::get('/documents', [CourseAiQuizController::class, 'indexDocuments']);
            Route::post('/documents', [CourseAiQuizController::class, 'storeDocument']);
            Route::post('/preview', [CourseAiQuizController::class, 'preview']);
            Route::post('/generate', [CourseAiQuizController::class, 'generate']);
            Route::post('/{quiz}/publish', [CourseAiQuizController::class, 'publish']);
            Route::delete('/{quiz}', [CourseAiQuizController::class, 'destroy']);
            Route::get('/{quiz}/attempts', [CourseAiQuizController::class, 'indexAttempts']);
        });

        Route::get('/', [CourseAiQuizController::class, 'index']);
        Route::get('/{quiz}', [CourseAiQuizController::class, 'show']);
        Route::post('/{quiz}/submit', [CourseAiQuizController::class, 'submit'])->middleware('role:student');
        Route::get('/{quiz}/attempts/{attempt}', [CourseAiQuizController::class, 'showAttempt']);
    });

    // AI Study Assistant (students only)
    Route::prefix('ai')->middleware('role:student')->group(function () {
        Route::get('/suggested-prompts', [AiStudyAssistantController::class, 'suggestedPrompts']);
        Route::get('/conversations', [AiStudyAssistantController::class, 'indexConversations']);
        Route::get('/conversations/{conversation}', [AiStudyAssistantController::class, 'showConversation']);
        Route::post('/chat', [AiStudyAssistantController::class, 'chat']);
        Route::post('/summary', [AiStudyAssistantController::class, 'summary']);
        Route::post('/quiz', [AiStudyAssistantController::class, 'quiz']);
        Route::post('/study-plan', [AiStudyAssistantController::class, 'studyPlan']);
    });

    // AI Exam Preparation Center (students only)
    Route::prefix('ai-exam-prep')->middleware('role:student')->group(function () {
        Route::get('/suggested-prompts', [AiExamPrepController::class, 'suggestedPrompts']);
        Route::get('/weak-subjects', [AiExamPrepController::class, 'weakSubjects']);
        Route::get('/conversations', [AiExamPrepController::class, 'indexConversations']);
        Route::post('/conversations', [AiExamPrepController::class, 'storeConversation']);
        Route::get('/conversations/{conversation}', [AiExamPrepController::class, 'showConversation']);
        Route::delete('/conversations/{conversation}', [AiExamPrepController::class, 'destroyConversation']);
        Route::post('/conversations/{conversation}/messages', [AiExamPrepController::class, 'sendMessage']);
    });

    Route::get('/submissions/{submission}/file', [SubmissionController::class, 'downloadFile']);

    // Student read access (enrollment, groups, schedule filters)
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/{student}', [StudentController::class, 'show']);
    });

    // Admin / SuperAdmin
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('/students-stats', [StudentController::class, 'stats']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{student}', [StudentController::class, 'update']);
        Route::patch('/students/{student}', [StudentController::class, 'update']);
        Route::delete('/students/{student}', [StudentController::class, 'destroy']);
        Route::apiResource('teachers', TeacherController::class);
        Route::apiResource('parents', ParentController::class);
        Route::post('/parents/{parent}/link-students', [ParentController::class, 'syncStudents']);

        Route::get('/activity-logs', [ActivityLogController::class, 'index']);

        Route::apiResource('events', EventController::class)->except(['index', 'show']);

        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);

        Route::get('/settings', [SettingsController::class, 'index']);
        Route::put('/settings', [SettingsController::class, 'update']);

        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update']);
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        Route::prefix('security')->group(function () {
            Route::get('/overview', [SecurityCenterController::class, 'overview']);
            Route::get('/login-history', [SecurityCenterController::class, 'loginHistory']);
            Route::get('/failed-attempts', [SecurityCenterController::class, 'failedAttempts']);
            Route::get('/last-logins', [SecurityCenterController::class, 'lastLogins']);
            Route::get('/sessions', [SecurityCenterController::class, 'sessions']);
            Route::delete('/sessions/{tokenId}', [SecurityCenterController::class, 'revokeSession']);
            Route::get('/devices', [SecurityCenterController::class, 'devices']);
            Route::get('/activity', [SecurityCenterController::class, 'accountActivity']);
        });

        Route::prefix('backups')->group(function () {
            Route::post('/restore-upload', [BackupController::class, 'restoreUpload']);
            Route::get('/', [BackupController::class, 'index']);
            Route::post('/', [BackupController::class, 'store']);
            Route::get('/{backup}/download', [BackupController::class, 'download']);
            Route::post('/{backup}/restore', [BackupController::class, 'restore']);
            Route::delete('/{backup}', [BackupController::class, 'destroy']);
        });

        Route::prefix('import-export')->group(function () {
            Route::get('/types', [ImportExportController::class, 'types']);
            Route::get('/templates/{type}', [ImportExportController::class, 'template']);
            Route::get('/export/{type}', [ImportExportController::class, 'export']);
            Route::post('/import/{type}', [ImportExportController::class, 'import']);
            Route::get('/jobs', [ImportExportController::class, 'recentJobs']);
            Route::get('/jobs/{job}', [ImportExportController::class, 'jobStatus']);
        });
    });

    // Grades write (teacher + admin)
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::post('/grades/bulk', [GradeController::class, 'bulk']);
        Route::get('/courses/{course}/grade-report', [GradeController::class, 'courseReport']);
        Route::apiResource('grades', GradeController::class)->except(['create', 'edit', 'index', 'show']);
    });
});
