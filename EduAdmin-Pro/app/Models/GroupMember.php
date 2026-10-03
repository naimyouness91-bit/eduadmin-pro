<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMember extends Model
{
    public const ROLE_OWNER = 'owner';

    public const ROLE_MODERATOR = 'moderator';

    public const ROLE_MEMBER = 'member';

    protected $fillable = [
        'group_id',
        'user_id',
        'role',
        'can_send_messages',
        'can_upload_files',
        'joined_at',
    ];

    protected $casts = [
        'can_send_messages' => 'boolean',
        'can_upload_files' => 'boolean',
        'joined_at' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isModerator(): bool
    {
        return in_array($this->role, [self::ROLE_OWNER, self::ROLE_MODERATOR], true);
    }
}
