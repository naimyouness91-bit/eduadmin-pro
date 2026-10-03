<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingMessage extends Model
{
    public const TYPE_CHAT = 'chat';

    public const TYPE_SYSTEM = 'system';

    protected $fillable = [
        'virtual_meeting_id',
        'user_id',
        'type',
        'content',
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
