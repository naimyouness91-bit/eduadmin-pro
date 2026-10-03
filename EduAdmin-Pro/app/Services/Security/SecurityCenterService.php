<?php

namespace App\Services\Security;

use App\Models\ActivityLog;
use App\Models\LoginEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class SecurityCenterService
{
    /**
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        $today = now()->startOfDay();

        return [
            'failed_logins_today' => LoginEvent::where('status', LoginEvent::STATUS_FAILED)
                ->where('created_at', '>=', $today)->count(),
            'successful_logins_today' => LoginEvent::where('status', LoginEvent::STATUS_SUCCESS)
                ->where('created_at', '>=', $today)->count(),
            'active_sessions' => $this->activeSessionsQuery()->count(),
            'unique_devices' => $this->connectedDevicesQuery()->count(),
            'users_with_recent_login' => User::whereNotNull('last_login_at')
                ->where('last_login_at', '>=', now()->subDays(7))
                ->count(),
            'failed_logins_7d' => LoginEvent::where('status', LoginEvent::STATUS_FAILED)
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
        ];
    }

    public function loginHistoryQuery(Request $request): Builder
    {
        $query = LoginEvent::query()
            ->with('user')
            ->where('status', LoginEvent::STATUS_SUCCESS)
            ->latest();

        $this->applyLoginFilters($query, $request);

        return $query;
    }

    public function failedAttemptsQuery(Request $request): Builder
    {
        $query = LoginEvent::query()
            ->with('user')
            ->where('status', LoginEvent::STATUS_FAILED)
            ->latest();

        $this->applyLoginFilters($query, $request);

        return $query;
    }

    public function activeSessionsQuery(?Request $request = null): Builder
    {
        $request ??= request();

        $query = PersonalAccessToken::query()
            ->with('tokenable')
            ->where('tokenable_type', User::class)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest('last_used_at');

        if ($request->filled('user_id')) {
            $query->where('tokenable_id', $request->integer('user_id'));
        }

        if ($search = $request->query('search')) {
            $query->whereHasMorph('tokenable', [User::class], function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    /**
     * @return \Illuminate\Support\Collection<int, object>
     */
    public function connectedDevicesQuery()
    {
        $sessions = DB::table('personal_access_tokens')
            ->join('users', 'users.id', '=', 'personal_access_tokens.tokenable_id')
            ->where('tokenable_type', User::class)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->select([
                'users.id as user_id',
                'users.name as user_name',
                'users.email as user_email',
                'personal_access_tokens.name as device_name',
                'personal_access_tokens.last_used_at',
                'personal_access_tokens.created_at',
            ])
            ->get();

        $recentLogins = LoginEvent::query()
            ->with('user')
            ->where('status', LoginEvent::STATUS_SUCCESS)
            ->where('created_at', '>=', now()->subDays(30))
            ->latest()
            ->get()
            ->unique(fn ($e) => $e->user_id.'|'.$e->device_name.'|'.$e->browser);

        return $sessions->map(function ($row) {
            return [
                'user_id' => $row->user_id,
                'user_name' => $row->user_name,
                'user_email' => $row->user_email,
                'device_name' => $row->device_name,
                'browser' => null,
                'platform' => null,
                'device_type' => 'desktop',
                'ip_address' => null,
                'last_seen_at' => $row->last_used_at ?? $row->created_at,
                'source' => 'session',
            ];
        })->merge($recentLogins->map(fn ($e) => [
            'user_id' => $e->user_id,
            'user_name' => $e->user?->name,
            'user_email' => $e->email,
            'device_name' => $e->device_name,
            'browser' => $e->browser,
            'platform' => $e->platform,
            'device_type' => $e->device_type,
            'ip_address' => $e->ip_address,
            'last_seen_at' => $e->created_at,
            'source' => 'login',
        ]))->unique(fn ($d) => ($d['user_id'] ?? '').'|'.($d['device_name'] ?? '').'|'.($d['browser'] ?? ''));
    }

    public function accountActivityQuery(Request $request): Builder
    {
        $query = ActivityLog::query()->with('user')->latest();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('category')) {
            $category = $request->query('category');
            $query->where(function ($q) use ($category) {
                match ($category) {
                    'auth' => $q->where(function ($inner) {
                        $inner->where('action', 'like', '%login%')
                            ->orWhere('action', 'like', '%logout%')
                            ->orWhere('action', 'like', '%2fa%')
                            ->orWhere('action', 'like', '%password%');
                    }),
                    'account' => $q->where('action', 'like', '%profile%')
                        ->orWhere('action', 'like', '%student.%')
                        ->orWhere('action', 'like', '%teacher.%'),
                    default => null,
                };
            });
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
     * Users with last login for admin table.
     */
    public function lastLoginsQuery(Request $request): Builder
    {
        $query = User::query()
            ->select(['id', 'name', 'email', 'role', 'last_login_at', 'is_active'])
            ->orderByDesc('last_login_at');

        if ($request->filled('role')) {
            $query->where('role', $request->query('role'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    protected function applyLoginFilters(Builder $query, Request $request): void
    {
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($email = $request->query('email')) {
            $query->where('email', 'like', '%'.strtolower($email).'%');
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%"));
            });
        }
    }

    public function formatSession(PersonalAccessToken $token): array
    {
        /** @var User|null $user */
        $user = $token->tokenable;

        return [
            'id' => $token->id,
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'user_email' => $user?->email,
            'device_name' => $token->name,
            'last_used_at' => $token->last_used_at,
            'created_at' => $token->created_at,
            'expires_at' => $token->expires_at,
            'is_current' => false,
        ];
    }
}
