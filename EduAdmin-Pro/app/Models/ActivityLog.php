<?php

namespace App\Models;

use App\Services\ActivityLogService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_logs';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    protected $appends = ['action_label'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'model_type', 'model_id');
    }

    public function getActionLabelAttribute(): string
    {
        return app(ActivityLogService::class)->labelFor($this->action);
    }

    public function actionBadgeColor(): string
    {
        return match (true) {
            str_contains($this->action, 'deleted') || str_contains($this->action, 'logout') => 'danger',
            str_contains($this->action, 'created') || str_contains($this->action, 'login') || str_contains($this->action, 'added') => 'success',
            str_contains($this->action, 'updated') || str_contains($this->action, 'upload') => 'info',
            default => 'gray',
        };
    }
}
