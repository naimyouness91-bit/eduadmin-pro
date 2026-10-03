<?php

namespace App\Services\Security;

use App\Models\LoginEvent;
use App\Models\User;
use Illuminate\Http\Request;

class LoginEventService
{
    public function __construct(
        protected UserAgentParser $userAgentParser
    ) {}

    public function recordSuccess(User $user, Request $request, ?string $deviceName = null): LoginEvent
    {
        return $this->record($user, $user->email, LoginEvent::STATUS_SUCCESS, null, $request, $deviceName);
    }

    public function recordFailed(string $email, string $reason, Request $request, ?User $user = null): LoginEvent
    {
        return $this->record($user, strtolower($email), LoginEvent::STATUS_FAILED, $reason, $request, $request->input('device_name'));
    }

    protected function record(
        ?User $user,
        string $email,
        string $status,
        ?string $failureReason,
        Request $request,
        ?string $deviceName
    ): LoginEvent {
        $parsed = $this->userAgentParser->parse($request->userAgent());

        return LoginEvent::create([
            'user_id' => $user?->id,
            'email' => $email,
            'status' => $status,
            'failure_reason' => $failureReason,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_name' => $deviceName ?? 'spa',
            'browser' => $parsed['browser'],
            'platform' => $parsed['platform'],
            'device_type' => $parsed['device_type'],
        ]);
    }
}
