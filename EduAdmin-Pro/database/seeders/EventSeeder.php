<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@eduadmin.com')->first();
        if (! $admin) {
            return;
        }

        $events = [
            [
                'title' => 'Midterm Examinations',
                'description' => 'Midterm exams for all Grade 10 courses.',
                'start_date' => now()->addDays(14)->setTime(8, 0),
                'end_date' => now()->addDays(18)->setTime(17, 0),
                'type' => 'exam',
                'color' => '#ef4444',
            ],
            [
                'title' => 'Staff Planning Meeting',
                'description' => 'Quarterly curriculum planning.',
                'start_date' => now()->addDays(7)->setTime(15, 0),
                'end_date' => now()->addDays(7)->setTime(17, 0),
                'type' => 'meeting',
                'color' => '#6366f1',
            ],
            [
                'title' => 'Spring Break',
                'description' => 'School closed for spring break.',
                'start_date' => now()->addDays(30)->startOfDay(),
                'end_date' => now()->addDays(37)->endOfDay(),
                'type' => 'holiday',
                'color' => '#22c55e',
            ],
            [
                'title' => 'Science Fair',
                'description' => 'Annual student science fair exhibition.',
                'start_date' => now()->addDays(21)->setTime(9, 0),
                'end_date' => now()->addDays(21)->setTime(16, 0),
                'type' => 'event',
                'color' => '#f59e0b',
            ],
        ];

        foreach ($events as $data) {
            Event::updateOrCreate(
                ['title' => $data['title']],
                [
                    ...$data,
                    'is_public' => true,
                    'created_by' => $admin->id,
                ]
            );
        }
    }
}
