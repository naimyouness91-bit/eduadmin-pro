<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class SystemBackup extends Model
{
    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_RESTORING = 'restoring';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'filename',
        'disk',
        'path',
        'size_bytes',
        'database_driver',
        'includes_files',
        'checksum',
        'status',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'includes_files' => 'boolean',
        'size_bytes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fullPath(): string
    {
        return Storage::disk($this->disk)->path($this->path);
    }
}
