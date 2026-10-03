<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class GroupMessage extends Model
{
    use SoftDeletes;

    public const TYPE_TEXT = 'text';

    public const TYPE_ANNOUNCEMENT = 'announcement';

    public const TYPE_DISCUSSION = 'discussion';

    public const TYPE_FILE = 'file';

    public const TYPE_MEETING = 'meeting';

    public const TYPE_ASSIGNMENT = 'assignment';

    protected $fillable = [
        'group_id',
        'user_id',
        'type',
        'content',
        'file_path',
        'file_name',
        'file_size',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'file_size' => 'integer',
    ];

    protected $appends = ['file_url'];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getFileUrlAttribute(): ?string
    {
        if (! $this->file_path) {
            return null;
        }

        return Storage::disk('public')->url($this->file_path);
    }
}
