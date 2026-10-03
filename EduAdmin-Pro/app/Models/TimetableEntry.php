<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TimetableEntry extends Model
{
    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_RESCHEDULED = 'rescheduled';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'timetable_id',
        'day_of_week',
        'start_time',
        'end_time',
        'course_id',
        'teacher_id',
        'room',
        'notes',
        'session_status',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
    ];

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function pendingRescheduleRequest(): HasOne
    {
        return $this->hasOne(TimetableRescheduleRequest::class, 'timetable_entry_id')
            ->where('status', TimetableRescheduleRequest::STATUS_PENDING);
    }
}
