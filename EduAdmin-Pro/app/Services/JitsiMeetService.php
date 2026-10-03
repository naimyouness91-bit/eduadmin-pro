<?php

namespace App\Services;

use App\Models\MeetingParticipant;
use App\Models\User;
use App\Models\VirtualMeeting;
use Illuminate\Support\Str;

class JitsiMeetService
{
    public function domain(): string
    {
        return rtrim(config('services.jitsi.domain', 'meet.jit.si'), '/');
    }

    public function generateRoomName(?string $prefix = null): string
    {
        $base = Str::slug($prefix ?: 'eduadmin', '-');
        $base = $base !== '' ? $base : 'eduadmin';

        return $base.'-'.Str::lower(Str::random(12));
    }

    public function meetingUrl(string $roomName): string
    {
        return 'https://'.$this->domain().'/'.rawurlencode($roomName);
    }

    /**
     * @return array<string, mixed>
     */
    public function joinConfig(VirtualMeeting $meeting, User $user, string $participantRole): array
    {
        $isModerator = in_array($participantRole, [
            MeetingParticipant::ROLE_HOST,
            MeetingParticipant::ROLE_MODERATOR,
        ], true) || $user->hasRole(['super_admin', 'admin']);

        return [
            'domain' => $this->domain(),
            'room_name' => $meeting->jitsi_room_name,
            'meeting_url' => $this->meetingUrl($meeting->jitsi_room_name),
            'user_display_name' => $user->name,
            'user_email' => $user->email,
            'config' => [
                'startWithAudioMuted' => ! $isModerator,
                'startWithVideoMuted' => false,
                'prejoinPageEnabled' => true,
                'disableDeepLinking' => true,
            ],
            'interface_config' => [
                'SHOW_JITSI_WATERMARK' => false,
                'TOOLBAR_BUTTONS' => [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'chat', 'raisehand',
                    'tileview', 'settings',
                ],
            ],
            'is_moderator' => $isModerator,
        ];
    }
}
