<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Seeder;

class AnnouncementSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@eduadmin.com')->firstOrFail();

        $announcements = [
            [
                'title' => 'Welcome to the Spring 2025 Semester',
                'content' => 'We are excited to welcome all students and staff to the new semester. Please review your schedules and course materials in the portal.',
                'target_role' => null,
                'is_published' => true,
                'published_at' => now()->subDays(14),
            ],
            [
                'title' => 'Midterm Exam Schedule Published',
                'content' => 'The midterm examination timetable is now available. Students should check their course pages for dates and room assignments.',
                'target_role' => 'student',
                'is_published' => true,
                'published_at' => now()->subDays(7),
            ],
            [
                'title' => 'Faculty Meeting — Curriculum Review',
                'content' => 'All teaching staff are invited to the curriculum review meeting next Friday at 3:00 PM in the main conference hall.',
                'target_role' => 'teacher',
                'is_published' => true,
                'published_at' => now()->subDays(5),
            ],
            [
                'title' => 'Parent-Teacher Conference Dates',
                'content' => 'Parent-teacher conferences will be held during the last week of the month. Parents can book slots through the parent portal.',
                'target_role' => 'parent',
                'is_published' => true,
                'published_at' => now()->subDays(3),
            ],
        ];

        foreach ($announcements as $data) {
            Announcement::updateOrCreate(
                ['title' => $data['title']],
                [
                    ...$data,
                    'created_by' => $admin->id,
                ]
            );
        }
    }
}
