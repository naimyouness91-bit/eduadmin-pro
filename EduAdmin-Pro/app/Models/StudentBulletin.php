<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentBulletin extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_GENERATED = 'generated';

    public const STATUS_PUBLISHED = 'published';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'student_id',
        'status',
        'academic_year',
        'semester',
        'generated_at',
        'generated_by',
        'published_at',
        'published_by',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'generated_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function generatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function publishedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    public function isGenerated(): bool
    {
        return in_array($this->status, [self::STATUS_GENERATED, self::STATUS_PUBLISHED], true);
    }
}
