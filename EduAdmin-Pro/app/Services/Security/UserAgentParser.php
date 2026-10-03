<?php

namespace App\Services\Security;

class UserAgentParser
{
    /**
     * @return array{browser: string, platform: string, device_type: string}
     */
    public function parse(?string $userAgent): array
    {
        $ua = $userAgent ?? '';

        $deviceType = preg_match('/mobile|android|iphone|ipad/i', $ua) ? 'mobile' : 'desktop';

        $browser = 'Unknown';
        if (preg_match('/Edg\//i', $ua)) {
            $browser = 'Edge';
        } elseif (preg_match('/Chrome\//i', $ua) && ! preg_match('/Edg\//i', $ua)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Firefox\//i', $ua)) {
            $browser = 'Firefox';
        } elseif (preg_match('/Safari\//i', $ua) && ! preg_match('/Chrome\//i', $ua)) {
            $browser = 'Safari';
        }

        $platform = 'Unknown';
        if (preg_match('/Windows/i', $ua)) {
            $platform = 'Windows';
        } elseif (preg_match('/Mac OS X|Macintosh/i', $ua)) {
            $platform = 'macOS';
        } elseif (preg_match('/Android/i', $ua)) {
            $platform = 'Android';
        } elseif (preg_match('/iPhone|iPad/i', $ua)) {
            $platform = 'iOS';
        } elseif (preg_match('/Linux/i', $ua)) {
            $platform = 'Linux';
        }

        return [
            'browser' => $browser,
            'platform' => $platform,
            'device_type' => $deviceType,
        ];
    }
}
