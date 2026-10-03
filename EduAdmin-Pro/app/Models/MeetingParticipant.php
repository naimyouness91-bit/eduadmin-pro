<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingParticipant extends Model
{
    public const ROLE_HOST = 'host';

    public const ROLE_MODERATOR = 'moderator';

    public const ROLE_PARTICIPANT = 'participant';

    protected $fillable = [
        'virtual_meeting_id',
        'user_id',
        'role',
        'hand_raised',
        'invited_at',
        'joined_at',
        'left_at',
        'total_duration_seconds',
    ];

    protected $casts = [
        'hand_raised' => 'boolean',
        'invited_at' => 'datetime',
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(VirtualMeeting::class, 'virtual_meeting_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
