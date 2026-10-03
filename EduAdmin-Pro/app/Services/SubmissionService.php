<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Submission;
use Carbon\CarbonInterface;

class SubmissionService
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_LATE = 'late';

    public const STATUS_REVIEWED = 'reviewed';

    /**
     * Status shown to the student for an assignment.
     */
    public function studentDisplayStatus(Assignment $assignment, ?Submission $submission): string
    {
        if (! $submission) {
            return self::STATUS_PENDING;
        }

        if ($submission->status === self::STATUS_REVIEWED) {
            return self::STATUS_REVIEWED;
        }

        return $submission->status ?? self::STATUS_PENDING;
    }

    /**
     * Persisted status when a student submits work.
     */
    public function statusForSubmit(Assignment $assignment, ?CarbonInterface $submittedAt = null): string
    {
        $at = $submittedAt ?? now();

        if ($assignment->due_date && $at->isAfter($assignment->due_date)) {
            return self::STATUS_LATE;
        }

        return self::STATUS_SUBMITTED;
    }
}
