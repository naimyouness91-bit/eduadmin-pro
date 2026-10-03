<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthService;
use App\Services\Security\LoginEventService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService,
        protected LoginEventService $loginEventService
    ) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'remember_me' => ['sometimes', 'boolean'],
            'device_name' => ['sometimes', 'string', 'max:255'],
        ]);

        $user = User::withTrashed()->where('email', $credentials['email'])->first();

        if (! $user) {
            $this->loginEventService->recordFailed($credentials['email'], 'invalid_credentials', $request);
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if ($user->trashed()) {
            $this->loginEventService->recordFailed($credentials['email'], 'account_deactivated', $request, $user);
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated. Please contact an administrator.'],
            ]);
        }

        if (! Hash::check($credentials['password'], $user->password)) {
            $this->loginEventService->recordFailed($credentials['email'], 'invalid_password', $request, $user);
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->is_active) {
            $this->loginEventService->recordFailed($credentials['email'], 'account_inactive', $request, $user);
            throw ValidationException::withMessages([
                'email' => ['This account is deactivated.'],
            ]);
        }

        if ($user->hasTwoFactorEnabled()) {
            if (empty($credentials['code'])) {
                return response()->json([
                    'requires_2fa' => true,
                    'message' => 'Two-factor authentication code required.',
                ]);
            }

            if (! $this->authService->verifyTwoFactor($user, $credentials['code'])) {
                $this->loginEventService->recordFailed($credentials['email'], 'invalid_2fa_code', $request, $user);
                throw ValidationException::withMessages([
                    'code' => ['Invalid two-factor authentication code.'],
                ]);
            }
        }

        $expiresAt = ($credentials['remember_me'] ?? false)
            ? now()->addDays(30)
            : now()->addDay();

        $deviceName = $credentials['device_name'] ?? 'spa';
        $token = $user->createToken($deviceName, ['*'], $expiresAt)->plainTextToken;

        $user->update(['last_login_at' => now()]);

        $this->loginEventService->recordSuccess($user, $request, $deviceName);
        $this->authService->logActivity($user, \App\Services\ActivityLogService::ACTION_USER_LOGIN, 'User logged in.');

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $this->formatUser($user->fresh()->load(['student', 'teacher', 'parent'])),
            'redirect_url' => $this->getRedirectUrl($user->role),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        $this->authService->logActivity($user, \App\Services\ActivityLogService::ACTION_USER_LOGOUT, 'User logged out.');

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['student', 'teacher', 'parent']);

        return response()->json([
            'user' => $this->formatUser($user),
            'recent_activities' => $this->formatRecentActivities(
                $user->activityLogs()->latest()->limit(10)->get()
            ),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => __($status)]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => __($status)]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate([
            'id' => ['required', 'integer'],
            'hash' => ['required', 'string'],
        ]);

        $user = User::findOrFail($request->id);

        if ($request->user()->id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if (! hash_equals(sha1($user->getEmailForVerification()), (string) $request->hash)) {
            return response()->json(['message' => 'Invalid verification link.'], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return response()->json([
            'message' => 'Email verified successfully.',
            'user' => $this->formatUser($user->fresh()),
        ]);
    }

    public function enableTwoFactor(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = $this->authService->generateTwoFactorSecret($user);

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $this->authService->getTwoFactorQrCode($user->fresh()),
            'message' => 'Scan the QR code with your authenticator app, then confirm with a code.',
        ]);
    }

    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();

        if (! $this->authService->verifyTwoFactor($user, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        return response()->json([
            'message' => 'Two-factor authentication enabled.',
            'recovery_codes' => $this->authService->getRecoveryCodes($user->fresh()),
        ]);
    }

    public function disableTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Invalid password.'],
            ]);
        }

        if (! $this->authService->verifyTwoFactor($user, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        $this->authService->logActivity($user, 'user.2fa_disabled', 'Two-factor authentication disabled.');

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[\d\s+\-().]*$/'],
            'address' => ['nullable', 'string', 'max:500'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'in:male,female,other'],
            'locale' => ['sometimes', 'string', 'max:10'],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'theme' => ['sometimes', 'in:light,dark'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,jpg,png,gif,webp', 'max:2048'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $user->avatar = $request->file('avatar')->store('avatars', 'public');
            $this->authService->logActivity($user, \App\Services\ActivityLogService::ACTION_FILE_UPLOAD, 'Avatar image uploaded.', [
                'new_values' => ['path' => $user->avatar, 'type' => 'avatar'],
            ]);
        }

        $user->fill(collect($data)->except('avatar')->toArray());
        $user->save();

        $this->authService->logActivity($user, 'user.profile_updated', 'Profile updated.');

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->formatUser($user->fresh()->load(['student', 'teacher', 'parent'])),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        $this->authService->logActivity($user, 'user.password_changed', 'Password changed.');

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \App\Models\ActivityLog>|\Illuminate\Database\Eloquent\Collection  $logs
     * @return array<int, array<string, mixed>>
     */
    private function formatRecentActivities($logs): array
    {
        return $logs->map(fn ($log) => [
            'id' => $log->id,
            'action' => $log->action,
            'action_label' => $log->action_label,
            'description' => $log->description,
            'created_at' => $log->created_at?->toIso8601String(),
        ])->all();
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar_url,
            'phone' => $user->phone,
            'address' => $user->address,
            'date_of_birth' => $user->date_of_birth?->toDateString(),
            'gender' => $user->gender,
            'is_active' => $user->is_active,
            'account_status' => $user->is_active ? 'active' : 'inactive',
            'locale' => $user->locale,
            'timezone' => $user->timezone,
            'theme' => $user->theme,
            'bio' => $user->bio,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'email_verified' => $user->hasVerifiedEmail(),
            'two_factor_enabled' => $user->hasTwoFactorEnabled(),
            'student' => $user->relationLoaded('student') ? $user->student : null,
            'teacher' => $user->relationLoaded('teacher') ? $user->teacher : null,
            'parent' => $user->relationLoaded('parent') ? $user->parent : null,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    private function getRedirectUrl(string $role): string
    {
        return match ($role) {
            'super_admin', 'admin' => '/admin/dashboard',
            'teacher' => '/teacher/dashboard',
            'student' => '/student/dashboard',
            'parent' => '/parent/dashboard',
            default => '/dashboard',
        };
    }
}
