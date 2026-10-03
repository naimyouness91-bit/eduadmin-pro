<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Group extends Model
{
    use SoftDeletes;

    public const TYPE_STUDENT = 'student';

    public const TYPE_TEACHER = 'teacher';

    public const TYPE_MIXED = 'mixed';

    public const TYPE_COURSE = 'course';

    public const TYPE_ANNOUNCEMENT = 'announcement';

    public const AUDIENCE_CUSTOM = 'custom';

    public const AUDIENCE_ALL_STUDENTS = 'all_students';

    public const AUDIENCE_FINAL_YEAR = 'final_year';

    public const AUDIENCE_SCHOLARSHIP = 'scholarship';

    /**
     * Grade levels treated as final year for audience enrollment.
     *
     * @var array<int, string>
     */
    public const FINAL_YEAR_LEVELS = [
        'Grade 12',
        '12',
        'Year 12',
        'Final Year',
        'Grade 12 A',
        'Grade 12 B',
    ];

    /**
     * @var array<int, string>
     */
    public const AUDIENCES = [
        self::AUDIENCE_CUSTOM,
        self::AUDIENCE_ALL_STUDENTS,
        self::AUDIENCE_FINAL_YEAR,
        self::AUDIENCE_SCHOLARSHIP,
    ];

    /**
     * @var array<int, string>
     */
    public const TYPES = [
        self::TYPE_STUDENT,
        self::TYPE_TEACHER,
        self::TYPE_MIXED,
        self::TYPE_COURSE,
        self::TYPE_ANNOUNCEMENT,
    ];

    protected $fillable = [
        'name',
        'description',
        'type',
        'audience',
        'course_id',
        'created_by',
        'allow_student_messages',
        'allow_student_files',
        'allow_discussions',
    ];

    protected $casts = [
        'allow_student_messages' => 'boolean',
        'allow_student_files' => 'boolean',
        'allow_discussions' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(GroupMember::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(GroupMessage::class);
    }
}
