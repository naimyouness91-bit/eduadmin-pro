<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MeetingResource extends Model
{
    protected $fillable = [
        'virtual_meeting_id',
        'uploaded_by',
        'file_path',
        'file_name',
        'file_size',
    ];

    protected $appends = ['file_url'];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(VirtualMeeting::class, 'virtual_meeting_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? Storage::disk('public')->url($this->file_path) : null;
    }
}
