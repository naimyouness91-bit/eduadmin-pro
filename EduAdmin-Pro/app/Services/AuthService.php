<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class AuthService
{
    public function __construct(
        protected Google2FA $google2fa
    ) {}

    public function generateTwoFactorSecret(User $user): string
    {
        $secret = $this->google2fa->generateSecretKey();

        $user->forceFill([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        return $secret;
    }

    public function getTwoFactorQrCode(User $user): string
    {
        if (! $user->two_factor_secret) {
            throw new \RuntimeException('Two-factor authentication is not initialized for this user.');
        }

        $secret = Crypt::decryptString($user->two_factor_secret);

        return $this->google2fa->getQRCodeUrl(
            config('app.name', 'EduAdmin Pro'),
            $user->email,
            $secret
        );
    }

    public function verifyTwoFactor(User $user, string $code): bool
    {
        if (! $user->two_factor_secret) {
            return false;
        }

        $secret = Crypt::decryptString($user->two_factor_secret);
        $valid = $this->google2fa->verifyKey($secret, $code);

        if (! $valid) {
            return false;
        }

        if (! $user->two_factor_confirmed_at) {
            $recoveryCodes = $this->buildRecoveryCodes();

            $user->forceFill([
                'two_factor_confirmed_at' => now(),
                'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes)),
            ])->save();

            $this->logActivity(
                $user,
                'user.2fa_enabled',
                'Two-factor authentication enabled.',
            );
        }

        return true;
    }

    public function getRecoveryCodes(User $user): array
    {
        if (! $user->two_factor_recovery_codes) {
            return [];
        }

        $decoded = json_decode(Crypt::decryptString($user->two_factor_recovery_codes), true);

        return is_array($decoded) ? $decoded : [];
    }

    public function logActivity(User $user, string $action, string $desc, array $extra = []): void
    {
        app(ActivityLogService::class)->record($user, $action, $desc, $extra);
    }

    /**
     * @return array<int, string>
     */
    protected function buildRecoveryCodes(int $count = 8): array
    {
        $codes = [];

        for ($i = 0; $i < $count; $i++) {
            $codes[] = Str::upper(Str::random(4).'-'.Str::random(4));
        }

        return $codes;
    }
}
