<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataImportJob extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'type',
        'status',
        'original_filename',
        'total_rows',
        'processed_rows',
        'success_count',
        'skipped_count',
        'failed_count',
        'errors',
        'message',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'errors' => 'array',
        'total_rows' => 'integer',
        'processed_rows' => 'integer',
        'success_count' => 'integer',
        'skipped_count' => 'integer',
        'failed_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function progressPercent(): int
    {
        if ($this->total_rows <= 0) {
            return $this->status === self::STATUS_COMPLETED ? 100 : 0;
        }

        return (int) min(100, round(($this->processed_rows / $this->total_rows) * 100));
    }
}
