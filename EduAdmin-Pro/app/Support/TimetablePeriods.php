<?php

namespace App\Support;

class TimetablePeriods
{
    /** School week (Monday–Saturday). Auto-generation uses Mon–Fri only. */
    public const DAYS = [
        ['value' => 1, 'key' => 'monday', 'short' => 'Mon', 'label' => 'Monday', 'label_fr' => 'Lundi'],
        ['value' => 2, 'key' => 'tuesday', 'short' => 'Tue', 'label' => 'Tuesday', 'label_fr' => 'Mardi'],
        ['value' => 3, 'key' => 'wednesday', 'short' => 'Wed', 'label' => 'Wednesday', 'label_fr' => 'Mercredi'],
        ['value' => 4, 'key' => 'thursday', 'short' => 'Thu', 'label' => 'Thursday', 'label_fr' => 'Jeudi'],
        ['value' => 5, 'key' => 'friday', 'short' => 'Fri', 'label' => 'Friday', 'label_fr' => 'Vendredi'],
        ['value' => 6, 'key' => 'saturday', 'short' => 'Sat', 'label' => 'Saturday', 'label_fr' => 'Samedi'],
    ];

    /** Standard 2-hour school blocks (Mon–Fri generation). */
    public const SCHEDULE_BLOCKS = [
        ['start' => '08:00', 'end' => '10:00', 'label' => '08:00 – 10:00', 'band' => 'morning'],
        ['start' => '10:00', 'end' => '12:00', 'label' => '10:00 – 12:00', 'band' => 'morning'],
        ['start' => '14:00', 'end' => '16:00', 'label' => '14:00 – 16:00', 'band' => 'afternoon'],
        ['start' => '16:00', 'end' => '18:00', 'label' => '16:00 – 18:00', 'band' => 'afternoon'],
    ];

    /** Grid display periods — 2-hour blocks for realistic school timetables. */
    public const PERIODS = self::SCHEDULE_BLOCKS;

    public const WEEKDAY_VALUES = [1, 2, 3, 4, 5];

    public const MIN_SESSION_MINUTES = 120;

    public static function normalizeTime(string $time): string
    {
        return substr(trim($time), 0, 5);
    }

    /**
     * @return array<int, string> validation errors keyed by field
     */
    public static function validateSession(int $day, string $start, string $end): array
    {
        $errors = [];

        if ($day < 1 || $day > 7) {
            $errors['day_of_week'] = 'Invalid day of week.';
        }

        $start = self::normalizeTime($start);
        $end = self::normalizeTime($end);

        if (! preg_match('/^\d{2}:\d{2}$/', $start)) {
            $errors['start_time'] = 'Start time must be HH:MM.';
        }
        if (! preg_match('/^\d{2}:\d{2}$/', $end)) {
            $errors['end_time'] = 'End time must be HH:MM.';
        }

        if (empty($errors) && strtotime($end) <= strtotime($start)) {
            $errors['end_time'] = 'End time must be after start time.';
        }

        if (empty($errors)) {
            $duration = (strtotime($end) - strtotime($start)) / 60;
            if ($duration < self::MIN_SESSION_MINUTES) {
                $errors['end_time'] = 'Sessions must be at least 2 hours long.';
            }
        }

        return $errors;
    }

    public static function periodsMeta(): array
    {
        return self::PERIODS;
    }

    public static function isStandardPeriod(string $start, string $end): bool
    {
        $start = self::normalizeTime($start);
        $end = self::normalizeTime($end);

        foreach (self::PERIODS as $period) {
            if ($period['start'] === $start && $period['end'] === $end) {
                return true;
            }
        }

        return false;
    }

    public static function bandForTime(string $start): string
    {
        $start = self::normalizeTime($start);

        foreach (self::SCHEDULE_BLOCKS as $block) {
            if ($block['start'] === $start) {
                return $block['band'];
            }
        }

        $hour = (int) substr($start, 0, 2);

        return $hour < 13 ? 'morning' : 'afternoon';
    }

    /**
     * @return array<int, array{day: int, start: string, end: string, band: string}>
     */
    public static function weekdaySlots(): array
    {
        $slots = [];
        foreach (self::WEEKDAY_VALUES as $day) {
            foreach (self::SCHEDULE_BLOCKS as $block) {
                $slots[] = [
                    'day' => $day,
                    'start' => $block['start'],
                    'end' => $block['end'],
                    'band' => $block['band'],
                ];
            }
        }

        return $slots;
    }
}
