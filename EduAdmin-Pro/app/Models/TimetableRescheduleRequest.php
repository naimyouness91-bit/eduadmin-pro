<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimetableRescheduleRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'timetable_entry_id',
        'requested_by',
        'status',
        'reason',
        'original_day_of_week',
        'original_start_time',
        'original_end_time',
        'proposed_day_of_week',
        'proposed_start_time',
        'proposed_end_time',
        'proposed_room',
        'admin_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'original_day_of_week' => 'integer',
        'proposed_day_of_week' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(TimetableEntry::class, 'timetable_entry_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
