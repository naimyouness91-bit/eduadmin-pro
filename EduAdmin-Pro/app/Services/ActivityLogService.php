<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Request as RequestFacade;
class ActivityLogService
{
    public const ACTION_STUDENT_CREATED = 'student.created';

    public const ACTION_STUDENT_UPDATED = 'student.updated';

    public const ACTION_STUDENT_DELETED = 'student.deleted';

    public const ACTION_TEACHER_CREATED = 'teacher.created';

    public const ACTION_TEACHER_UPDATED = 'teacher.updated';

    public const ACTION_TEACHER_DELETED = 'teacher.deleted';

    public const ACTION_GRADE_ADDED = 'grade.added';

    public const ACTION_ATTENDANCE_UPDATED = 'attendance.updated';

    public const ACTION_USER_LOGIN = 'user.login';

    public const ACTION_USER_LOGOUT = 'user.logout';

    public const ACTION_FILE_UPLOAD = 'file.upload';

    /**
     * @var array<int, string>
     */
    protected array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'token',
    ];

    /**
     * @return array<string, string>
     */
    public function actionLabels(): array
    {
        return [
            self::ACTION_STUDENT_CREATED => 'Student created',
            self::ACTION_STUDENT_UPDATED => 'Student updated',
            self::ACTION_STUDENT_DELETED => 'Student deleted',
            self::ACTION_TEACHER_CREATED => 'Teacher created',
            self::ACTION_TEACHER_UPDATED => 'Teacher updated',
            self::ACTION_TEACHER_DELETED => 'Teacher deleted',
            self::ACTION_GRADE_ADDED => 'Grade added',
            self::ACTION_ATTENDANCE_UPDATED => 'Attendance updated',
            self::ACTION_USER_LOGIN => 'Login',
            self::ACTION_USER_LOGOUT => 'Logout',
            self::ACTION_FILE_UPLOAD => 'File upload',
        ];
    }

    /**
     * @return array<int, string>
     */
    public function trackedActions(): array
    {
        return array_keys($this->actionLabels());
    }

    public function labelFor(string $action): string
    {
        return $this->actionLabels()[$action]
            ?? ucfirst(str_replace(['.', '_'], ' ', $action));
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function record(?User $actor, string $action, string $description, array $context = []): ActivityLog
    {
        return ActivityLog::create([
            'user_id' => $actor?->id,
            'action' => $action,
            'description' => $description,
            'model_type' => $context['model_type'] ?? null,
            'model_id' => $context['model_id'] ?? null,
            'old_values' => isset($context['old_values'])
                ? $this->filterSensitive($context['old_values'])
                : null,
            'new_values' => isset($context['new_values'])
                ? $this->filterSensitive($context['new_values'])
                : null,
            'ip_address' => $context['ip_address'] ?? RequestFacade::ip(),
            'user_agent' => $context['user_agent'] ?? RequestFacade::userAgent(),
        ]);
    }

    public function filteredQuery(Request $request): Builder
    {
        $query = ActivityLog::query()->with('user')->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.$request->query('action').'%');
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('model_type')) {
            $query->where('model_type', 'like', '%'.$request->query('model_type').'%');
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }

        return $query;
    }

    /**
     * Routes that emit dedicated audit entries (skip generic middleware logging).
     */
    public function shouldSkipAutomaticLog(Request $request): bool
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return true;
        }

        $path = trim($request->path(), '/');

        $patterns = [
            'api/auth/logout',
            'api/auth/profile',
            'api/auth/change-password',
            'api/auth/2fa',
            'api/auth/verify-email',
            'api/students',
            'api/teachers',
            'api/grades',
            'api/attendance/mark',
            'api/attendance/bulk',
        ];

        foreach ($patterns as $pattern) {
            if ($path === $pattern || str_starts_with($path, $pattern.'/')) {
                return true;
            }
        }

        if (preg_match('#^api/attendance(/|$)#', $path) && $request->isMethod('POST')) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function filterSensitive(array $payload): array
    {
        $filtered = [];

        foreach ($payload as $key => $value) {
            if (in_array($key, $this->sensitiveKeys, true)) {
                continue;
            }

            if ($value instanceof UploadedFile) {
                $filtered[$key] = $value->getClientOriginalName();
            } elseif (is_array($value)) {
                $filtered[$key] = $this->filterSensitive($value);
            } else {
                $filtered[$key] = $value;
            }
        }

        return $filtered;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function filterSensitiveFromRequest(array $payload): array
    {
        return $this->filterSensitive($payload);
    }
}
