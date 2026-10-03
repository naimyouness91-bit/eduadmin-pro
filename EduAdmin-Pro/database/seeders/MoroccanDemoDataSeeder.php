<?php

namespace Database\Seeders;

use App\Models\Absence;
use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Event;
use App\Models\Grade;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\MeetingParticipant;
use App\Models\ParentModel;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\Submission;
use App\Models\Teacher;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Models\VirtualMeeting;
use App\Services\FreshDeploymentService;
use App\Services\JitsiMeetService;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MoroccanDemoDataSeeder extends Seeder
{
    protected string $password;

    /** @var array<int, string> */
    protected array $gradeLevels = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    /** @var array<int, string> */
    protected array $sections = ['A', 'B'];

    /** @var array<int, array{name: string, specialization: string, department: string}> */
    protected array $teachers = [
        ['name' => 'Mohamed El Alaoui', 'specialization' => 'Mathematics', 'department' => 'Sciences & Mathematics'],
        ['name' => 'Fatima Zahra Benali', 'specialization' => 'Biology', 'department' => 'Sciences & Mathematics'],
        ['name' => 'Yassine El Mansouri', 'specialization' => 'Computer Science', 'department' => 'Technology'],
        ['name' => 'Amina Bennis', 'specialization' => 'English', 'department' => 'Languages & Humanities'],
        ['name' => 'Khalid El Fassi', 'specialization' => 'Physics', 'department' => 'Sciences & Mathematics'],
        ['name' => 'Samira Chraibi', 'specialization' => 'English Literature', 'department' => 'Languages & Humanities'],
        ['name' => 'Hassan Amrani', 'specialization' => 'Physics', 'department' => 'Sciences & Mathematics'],
        ['name' => 'Nadia Bennouna', 'specialization' => 'Mathematics', 'department' => 'Sciences & Mathematics'],
        ['name' => 'Rachid Benjelloun', 'specialization' => 'French', 'department' => 'Languages & Humanities'],
        ['name' => 'Leila Tazi', 'specialization' => 'Chemistry', 'department' => 'Sciences & Mathematics'],
    ];

    /** Moroccan first/last names used to build 8 students per class section. */
    protected array $studentNamePool = [
        'Youssef El Amrani', 'Hamza Alaoui', 'Ayoub Berrada', 'Mehdi El Idrissi',
        'Othmane Bennani', 'Anas Chraibi', 'Zakaria Tazi', 'Yassine Skalli',
        'Walid Ait Lahcen', 'Soufiane Raji', 'Amine El Mansouri', 'Omar El Fassi',
        'Sara Benjelloun', 'Imane El Idrissi', 'Salma Chraibi', 'Asmae El Fassi',
        'Ikram Naciri', 'Hajar Tahiri', 'Ghita Bennani', 'Lina El Yousfi',
        'Karim El Ouazzani', 'Reda Bensaid', 'Tarik El Harti', 'Bilal Cherkaoui',
        'Nour El Kadiri', 'Hiba Lamrani', 'Meryem El Fassi', 'Rim Benkirane',
        'Adil El Malki', 'Yassine Berrada', 'Hicham Alaoui', 'Kawtar El Amrani',
        'Ilyas Benjelloun', 'Oussama Tazi', 'Zineb Chraibi', 'Nadia El Idrissi',
        'Mohamed Skalli', 'Aya Bennani', 'Rania El Mansouri', 'Siham Raji',
        'Yassin Ait Lahcen', 'Houda Benali', 'Salim El Fassi', 'Dounia Naciri',
        'Abdelali Tahiri', 'Kenza Berrada', 'Mehdi Cherkaoui', 'Sanae El Ouazzani',
        'Anass Lamrani', 'Fatima Skalli', 'Yahya Benkirane', 'Ines El Kadiri',
        'Rayan Alaoui', 'Chaimae Bensaid', 'Ismail El Harti', 'Nisrine Chraibi',
        'Amal Benjelloun', 'Hassan El Amrani', 'Loubna Tazi', 'Saad El Idrissi',
        'Wissal Bennani', 'Othman Raji', 'Hafsa Ait Lahcen', 'Adam El Mansouri',
    ];

    public function run(): void
    {
        $this->password = Hash::make('password');

        app(FreshDeploymentService::class)->purgeDemoData(preserveCourses: true);

        $this->ensureAllCourses();
        $teacherMap = $this->seedTeachers();
        $this->assignTeachersToCourses($teacherMap);
        $studentMap = $this->seedStudents();
        $this->seedParents($studentMap);
        $this->enrollStudentsInCourses();
        $this->ensureSchedules();
        $this->ensureTimetables();
        $this->seedGrades();
        $this->seedAttendance();
        $this->seedAssignmentsAndSubmissions();
        $this->seedGroups($teacherMap, $studentMap);
        $this->seedMeetings($teacherMap);
        $this->seedAnnouncementsAndEvents();
        $this->seedNotifications();
    }

    /**
     * @return array<int, array{grade: string, section: string, names: array<int, string>}>
     */
    protected function classRoster(): array
    {
        $roster = [];
        $offset = 0;

        foreach ($this->gradeLevels as $grade) {
            foreach ($this->sections as $section) {
                $names = array_slice($this->studentNamePool, $offset, 8);
                $offset += 8;
                $roster[] = [
                    'grade' => $grade,
                    'section' => $section,
                    'names' => $names,
                ];
            }
        }

        return $roster;
    }

    /**
     * @return array<string, array{name: string, description: string, grade_level: string, room: string, teacher_specialization: string}>
     */
    protected function projectCourseCatalog(): array
    {
        $catalog = [];

        foreach ($this->gradeLevels as $grade) {
            $catalog = array_merge($catalog, $this->coursesForGrade($grade));
        }

        return $catalog;
    }

    /**
     * @return array<string, array{name: string, description: string, grade_level: string, room: string, teacher_specialization: string}>
     */
    protected function coursesForGrade(string $grade): array
    {
        $code = match ($grade) {
            'Grade 9' => '9',
            'Grade 10' => '10',
            'Grade 11' => '11',
            'Grade 12' => '12',
            default => '10',
        };

        $labels = match ($grade) {
            'Grade 9' => [
                'math' => 'Mathematics Fundamentals',
                'phys' => 'Introduction to Physics',
                'eng' => 'English Communication',
                'cs' => 'ICT & Digital Skills',
                'bio' => 'Life Sciences',
            ],
            'Grade 10' => [
                'math' => 'Advanced Mathematics',
                'phys' => 'Physics I',
                'eng' => 'English Literature',
                'cs' => 'Computer Science',
                'bio' => 'Biology',
            ],
            'Grade 11' => [
                'math' => 'Pre-Calculus',
                'phys' => 'Physics II',
                'eng' => 'Advanced English',
                'cs' => 'Programming & Algorithms',
                'bio' => 'Environmental Science',
            ],
            'Grade 12' => [
                'math' => 'Calculus',
                'phys' => 'Applied Physics',
                'eng' => 'World Literature',
                'cs' => 'Software Engineering',
                'bio' => 'Advanced Biology',
            ],
            default => [],
        };

        $rooms = ['Room 101', 'Lab 201', 'Room 305', 'Lab 102', 'Lab 301'];

        return [
            "MATH-{$code}01" => [
                'name' => $labels['math'],
                'description' => "{$labels['math']} — {$grade} curriculum.",
                'grade_level' => $grade,
                'room' => $rooms[0],
                'teacher_specialization' => 'Mathematics',
            ],
            "PHYS-{$code}01" => [
                'name' => $labels['phys'],
                'description' => "{$labels['phys']} — {$grade} curriculum.",
                'grade_level' => $grade,
                'room' => $rooms[1],
                'teacher_specialization' => 'Physics',
            ],
            "ENG-{$code}01" => [
                'name' => $labels['eng'],
                'description' => "{$labels['eng']} — {$grade} curriculum.",
                'grade_level' => $grade,
                'room' => $rooms[2],
                'teacher_specialization' => 'English Literature',
            ],
            "CS-{$code}01" => [
                'name' => $labels['cs'],
                'description' => "{$labels['cs']} — {$grade} curriculum.",
                'grade_level' => $grade,
                'room' => $rooms[3],
                'teacher_specialization' => 'Computer Science',
            ],
            "BIO-{$code}01" => [
                'name' => $labels['bio'],
                'description' => "{$labels['bio']} — {$grade} curriculum.",
                'grade_level' => $grade,
                'room' => $rooms[4],
                'teacher_specialization' => 'Biology',
            ],
        ];
    }

    protected function ensureAllCourses(): void
    {
        foreach ($this->projectCourseCatalog() as $code => $data) {
            Course::withTrashed()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'grade_level' => $data['grade_level'],
                    'credits' => 3,
                    'status' => 'active',
                    'semester' => 'Spring 2025',
                    'academic_year' => '2024-2025',
                    'room' => $data['room'],
                    'max_students' => 32,
                ]
            );
        }

        // Legacy Grade 10 codes kept for backward compatibility with existing references.
        $legacy = [
            'MATH-401' => 'MATH-1001',
            'PHYS-101' => 'PHYS-1001',
            'ENG-201' => 'ENG-1001',
            'CS-101' => 'CS-1001',
            'BIO-101' => 'BIO-1001',
        ];

        foreach ($legacy as $oldCode => $newCode) {
            $source = Course::where('code', $newCode)->first();
            if (! $source) {
                continue;
            }
            Course::withTrashed()->updateOrCreate(
                ['code' => $oldCode],
                [
                    'name' => $source->name,
                    'description' => $source->description,
                    'grade_level' => $source->grade_level,
                    'teacher_id' => $source->teacher_id,
                    'credits' => $source->credits,
                    'status' => $source->status,
                    'semester' => $source->semester,
                    'academic_year' => $source->academic_year,
                    'room' => $source->room,
                    'max_students' => $source->max_students,
                ]
            );
        }
    }

    /**
     * @return array<string, Teacher> keyed by teacher name
     */
    protected function seedTeachers(): array
    {
        $map = [];
        $index = 1;

        foreach ($this->teachers as $data) {
            $email = $this->emailFor($data['name'], 'teacher.eduadmin.com');
            $user = $this->createUser($data['name'], $email, 'teacher');
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'teacher_id' => 'TCH2026'.str_pad((string) $index, 4, '0', STR_PAD_LEFT),
                'specialization' => $data['specialization'],
                'department' => $data['department'],
                'qualification' => 'Master\'s Degree',
                'experience_years' => rand(5, 18),
                'employment_type' => 'full_time',
                'joining_date' => now()->subYears(rand(2, 8))->toDateString(),
            ]);
            $map[$data['name']] = $teacher;
            $index++;
        }

        return $map;
    }

    /**
     * @param  array<string, Teacher>  $teacherMap
     */
    protected function assignTeachersToCourses(array $teacherMap): void
    {
        $bySpec = collect($teacherMap)->keyBy(fn (Teacher $t) => $t->specialization);

        foreach ($this->projectCourseCatalog() as $code => $data) {
            $teacher = $bySpec->get($data['teacher_specialization'])
                ?? collect($teacherMap)->first();

            Course::where('code', $code)->update(['teacher_id' => $teacher?->id]);
        }

        $legacyMap = [
            'MATH-401' => 'MATH-1001',
            'PHYS-101' => 'PHYS-1001',
            'ENG-201' => 'ENG-1001',
            'CS-101' => 'CS-1001',
            'BIO-101' => 'BIO-1001',
        ];

        foreach ($legacyMap as $legacyCode => $modernCode) {
            $teacherId = Course::where('code', $modernCode)->value('teacher_id');
            if ($teacherId) {
                Course::where('code', $legacyCode)->update(['teacher_id' => $teacherId]);
            }
        }
    }

    /**
     * @return array<string, Student> keyed by student name
     */
    protected function seedStudents(): array
    {
        $map = [];
        $index = 1;
        $scholarshipNames = ['Ikram Naciri', 'Walid Ait Lahcen', 'Nour El Kadiri', 'Rayan Alaoui'];

        foreach ($this->classRoster() as $class) {
            foreach ($class['names'] as $name) {
                $email = $this->emailFor($name, 'student.eduadmin.com');
                $user = $this->createUser($name, $email, 'student', '+212 6'.rand(10, 99).rand(100000, 999999));
                $student = Student::create([
                    'user_id' => $user->id,
                    'student_id' => 'STU2026'.str_pad((string) $index, 4, '0', STR_PAD_LEFT),
                    'grade_level' => $class['grade'],
                    'section' => $class['section'],
                    'enrollment_status' => 'active',
                    'is_scholarship' => in_array($name, $scholarshipNames, true),
                    'enrollment_date' => now()->subMonths(rand(6, 10))->toDateString(),
                ]);
                $map[$name] = $student;
                $index++;
            }
        }

        return $map;
    }

    /**
     * @param  array<string, Student>  $studentMap
     */
    protected function seedParents(array $studentMap): void
    {
        $students = collect($studentMap)->values();
        $parentIndex = 0;

        foreach ($students->chunk(2) as $pair) {
            $first = $pair->first();
            $lastName = Str::after($first->user->name, ' ');
            $parentFirst = ['Ahmed', 'Khadija', 'Rachid', 'Naima', 'Mustapha', 'Latifa', 'Said', 'Karima'][$parentIndex % 8];
            $parentName = "{$parentFirst} {$lastName}";
            $email = $this->emailFor($parentName, 'parent.eduadmin.com');

            if (User::where('email', $email)->exists()) {
                $email = $this->emailFor($parentName.' '.($parentIndex + 1), 'parent.eduadmin.com');
            }

            $user = $this->createUser($parentName, $email, 'parent', '+212 6'.rand(10, 99).rand(100000, 999999));
            $parent = ParentModel::create([
                'user_id' => $user->id,
                'occupation' => ['Engineer', 'Teacher', 'Doctor', 'Merchant', 'Civil Servant', 'Architect', 'Pharmacist', 'Lawyer'][$parentIndex % 8],
                'relationship' => $parentIndex % 2 === 0 ? 'father' : 'mother',
            ]);

            $links = [];
            foreach ($pair as $i => $student) {
                $links[$student->id] = [
                    'relationship' => $parent->relationship,
                    'is_primary' => $i === 0,
                ];
            }
            $parent->students()->sync($links);
            $parentIndex++;
        }
    }

    protected function enrollStudentsInCourses(): void
    {
        $enrolledAt = now()->subMonths(6);

        foreach ($this->gradeLevels as $grade) {
            $courseIds = Course::where('grade_level', $grade)->pluck('id');
            $studentIds = Student::where('grade_level', $grade)->pluck('id');

            foreach ($courseIds as $courseId) {
                $sync = $studentIds->mapWithKeys(fn ($id) => [
                    $id => ['status' => 'active', 'enrolled_at' => $enrolledAt],
                ])->all();
                Course::find($courseId)?->students()->sync($sync);
            }
        }

        // Mirror enrollments on legacy Grade 10 course codes.
        $grade10Students = Student::where('grade_level', 'Grade 10')->pluck('id');
        $legacyCodes = ['MATH-401', 'PHYS-101', 'ENG-201', 'CS-101', 'BIO-101'];
        $sync10 = $grade10Students->mapWithKeys(fn ($id) => [
            $id => ['status' => 'active', 'enrolled_at' => $enrolledAt],
        ])->all();
        foreach ($legacyCodes as $code) {
            Course::where('code', $code)->first()?->students()->sync($sync10);
        }
    }

    protected function ensureTimetables(): void
    {
        $slotTemplate = [
            ['day' => 1, 'start' => '08:00', 'end' => '09:00', 'suffix' => 'MATH'],
            ['day' => 1, 'start' => '10:00', 'end' => '11:00', 'suffix' => 'PHYS'],
            ['day' => 2, 'start' => '08:00', 'end' => '09:00', 'suffix' => 'ENG'],
            ['day' => 2, 'start' => '13:00', 'end' => '14:00', 'suffix' => 'CS'],
            ['day' => 3, 'start' => '08:00', 'end' => '09:00', 'suffix' => 'BIO'],
            ['day' => 3, 'start' => '15:00', 'end' => '16:00', 'suffix' => 'MATH'],
            ['day' => 4, 'start' => '10:00', 'end' => '11:00', 'suffix' => 'PHYS'],
            ['day' => 5, 'start' => '13:00', 'end' => '14:00', 'suffix' => 'ENG'],
            ['day' => 6, 'start' => '08:00', 'end' => '09:00', 'suffix' => 'CS'],
        ];

        foreach ($this->classRoster() as $class) {
            $gradeCode = match ($class['grade']) {
                'Grade 9' => '9',
                'Grade 10' => '10',
                'Grade 11' => '11',
                'Grade 12' => '12',
                default => '10',
            };

            $classSection = ClassSection::firstOrCreate(
                [
                    'grade_level' => $class['grade'],
                    'section' => $class['section'],
                    'academic_year' => '2024-2025',
                ],
                [
                    'label' => ClassSection::labelFor($class['grade'], $class['section']),
                    'is_active' => true,
                ]
            );

            $timetable = Timetable::updateOrCreate(
                [
                    'class_section_id' => $classSection->id,
                    'name' => "Emploi du Temps — {$classSection->label}",
                ],
                [
                    'academic_year' => '2024-2025',
                    'semester' => 'Spring 2025',
                    'is_published' => true,
                ]
            );

            Timetable::query()
                ->where('class_section_id', $classSection->id)
                ->where('id', '!=', $timetable->id)
                ->update(['is_published' => false]);

            $courses = Course::where('grade_level', $class['grade'])->get()->keyBy('code');

            foreach ($slotTemplate as $slot) {
                $code = "{$slot['suffix']}-{$gradeCode}01";
                $course = $courses->get($code);
                if (! $course && $class['grade'] === 'Grade 10') {
                    $legacy = match ($slot['suffix']) {
                        'MATH' => 'MATH-401',
                        'PHYS' => 'PHYS-101',
                        'ENG' => 'ENG-201',
                        'CS' => 'CS-101',
                        'BIO' => 'BIO-101',
                        default => null,
                    };
                    $course = $legacy ? $courses->get($legacy) ?? Course::where('code', $legacy)->first() : null;
                }
                if (! $course) {
                    continue;
                }

                TimetableEntry::updateOrCreate(
                    [
                        'timetable_id' => $timetable->id,
                        'day_of_week' => $slot['day'],
                        'start_time' => $slot['start'],
                        'end_time' => $slot['end'],
                    ],
                    [
                        'course_id' => $course->id,
                        'teacher_id' => $course->teacher_id,
                        'room' => $course->room,
                    ]
                );
            }
        }
    }

    protected function ensureSchedules(): void
    {
        $courses = Course::with('teacher')->get();

        foreach ($courses as $course) {
            if (Schedule::where('course_id', $course->id)->exists()) {
                continue;
            }

            foreach ([1, 3, 5] as $day) {
                Schedule::create([
                    'course_id' => $course->id,
                    'teacher_id' => $course->teacher_id,
                    'day_of_week' => $day,
                    'start_time' => '08:00:00',
                    'end_time' => '09:30:00',
                    'room' => $course->room,
                    'semester' => $course->semester,
                    'academic_year' => $course->academic_year,
                    'is_active' => true,
                ]);
            }
        }
    }

    protected function seedGrades(): void
    {
        $types = ['exam', 'quiz', 'homework', 'project'];
        $startDate = now()->subMonths(3);

        Student::with('user', 'courses')->chunk(20, function ($students) use ($types, $startDate) {
            foreach ($students as $student) {
                foreach ($student->courses as $course) {
                    foreach ($types as $type) {
                        $score = $this->realisticScore($student->user->name, $course->code);
                        Grade::create([
                            'student_id' => $student->id,
                            'course_id' => $course->id,
                            'teacher_id' => $course->teacher_id,
                            'type' => $type,
                            'title' => ucfirst($type).' — '.$course->name,
                            'score' => $score,
                            'max_score' => 100,
                            'weight' => match ($type) {
                                'exam' => 2,
                                'project' => 1.5,
                                default => 1,
                            },
                            'graded_at' => $startDate->copy()->addDays(rand(5, 80))->toDateString(),
                            'semester' => 'Spring 2025',
                            'academic_year' => '2024-2025',
                            'feedback' => $score >= 70
                                ? 'Excellent travail, continuez ainsi.'
                                : 'Révisez les points faibles et demandez de l\'aide si nécessaire.',
                        ]);
                    }
                }
            }
        });
    }

    protected function seedAttendance(): void
    {
        $start = now()->subWeeks(4)->startOfDay();
        $end = now()->startOfDay();

        Student::with(['courses' => fn ($q) => $q->with('teacher')])->chunk(16, function ($students) use ($start, $end) {
            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                if ($date->isWeekend()) {
                    continue;
                }

                foreach ($students as $student) {
                    foreach ($student->courses as $course) {
                        $roll = crc32($student->id.$course->id.$date->toDateString()) % 100;
                        $status = $roll <= 85 ? 'present' : ($roll <= 93 ? 'late' : 'absent');

                        Absence::create([
                            'student_id' => $student->id,
                            'course_id' => $course->id,
                            'teacher_id' => $course->teacher_id,
                            'date' => $date->toDateString(),
                            'status' => $status,
                            'method' => 'manual',
                            'notes' => $status === 'absent' ? 'Absence non justifiée' : null,
                        ]);
                    }
                }
            }
        });
    }

    protected function seedAssignmentsAndSubmissions(): void
    {
        $titles = [
            ['Devoir maison — Chapitre 1', 'homework'],
            ['Contrôle continu', 'quiz'],
            ['Projet de fin de module', 'project'],
        ];

        Course::with(['teacher', 'students.user'])->chunk(10, function ($courses) use ($titles) {
            foreach ($courses as $course) {
                foreach ($titles as $i => [$title, $type]) {
                    $assignment = Assignment::create([
                        'course_id' => $course->id,
                        'teacher_id' => $course->teacher_id,
                        'title' => $title.' ('.$course->code.')',
                        'description' => 'Travail à rendre pour le cours '.$course->name.'. Consignes détaillées sur le portail.',
                        'due_date' => now()->addDays($i === 0 ? 7 : ($i === 1 ? 14 : 21)),
                        'max_score' => 20,
                        'type' => $type,
                        'status' => 'published',
                    ]);

                    $enrolled = $course->students;
                    $submitCount = max(4, (int) floor($enrolled->count() * 0.75));
                    $submittedStudents = $enrolled->shuffle()->take($submitCount);

                    foreach ($submittedStudents as $student) {
                        $score = rand(10, 20);
                        Submission::create([
                            'assignment_id' => $assignment->id,
                            'student_id' => $student->id,
                            'content' => 'Travail rendu par '.$student->user->name.'.',
                            'score' => $score,
                            'feedback' => $score >= 16 ? 'Très bon travail.' : 'Peut être amélioré.',
                            'status' => 'graded',
                            'submitted_at' => now()->subDays(rand(1, 10)),
                            'graded_at' => now()->subDays(rand(0, 3)),
                        ]);
                    }

                    $pendingStudents = $enrolled->reject(
                        fn ($s) => $submittedStudents->contains('id', $s->id)
                    )->take(max(2, (int) ceil($enrolled->count() * 0.15)));
                    foreach ($pendingStudents as $student) {
                        Submission::create([
                            'assignment_id' => $assignment->id,
                            'student_id' => $student->id,
                            'content' => 'Travail rendu — en attente de correction.',
                            'score' => null,
                            'feedback' => null,
                            'status' => 'submitted',
                            'submitted_at' => now()->subDays(rand(0, 3)),
                            'graded_at' => null,
                        ]);
                    }
                }
            }
        });
    }

    /**
     * @param  array<string, Teacher>  $teacherMap
     * @param  array<string, Student>  $studentMap
     */
    protected function seedGroups(array $teacherMap, array $studentMap): void
    {
        $superAdmin = User::where('email', FreshDeploymentService::SUPER_ADMIN_EMAIL)->first();
        $courses = Course::with(['teacher.user', 'students.user'])->get();

        foreach ($courses as $course) {
            $teacherUser = $course->teacher?->user;
            if (! $teacherUser) {
                continue;
            }

            $group = Group::create([
                'name' => $course->name.' — Groupe de cours',
                'description' => 'Espace collaboratif pour '.$course->name,
                'type' => Group::TYPE_COURSE,
                'course_id' => $course->id,
                'created_by' => $teacherUser->id,
                'allow_student_messages' => true,
                'allow_student_files' => true,
                'allow_discussions' => true,
            ]);

            GroupMember::create([
                'group_id' => $group->id,
                'user_id' => $teacherUser->id,
                'role' => 'admin',
            ]);

            foreach ($course->students as $student) {
                GroupMember::create([
                    'group_id' => $group->id,
                    'user_id' => $student->user_id,
                    'role' => 'member',
                ]);
            }
        }

        if ($superAdmin) {
            foreach ($this->gradeLevels as $grade) {
                $gradeStudents = collect($studentMap)->filter(
                    fn (Student $s) => $s->grade_level === $grade
                );

                $group = Group::create([
                    'name' => "Classe {$grade} — Communauté",
                    'description' => "Groupe général des élèves de {$grade}",
                    'type' => Group::TYPE_STUDENT,
                    'audience' => Group::AUDIENCE_ALL_STUDENTS,
                    'created_by' => $superAdmin->id,
                ]);

                GroupMember::create([
                    'group_id' => $group->id,
                    'user_id' => $superAdmin->id,
                    'role' => 'admin',
                ]);

                foreach ($gradeStudents as $student) {
                    GroupMember::create([
                        'group_id' => $group->id,
                        'user_id' => $student->user_id,
                        'role' => 'member',
                    ]);
                }
            }
        }
    }

    /**
     * @param  array<string, Teacher>  $teacherMap
     */
    protected function seedMeetings(array $teacherMap): void
    {
        $jitsi = app(JitsiMeetService::class);
        $courses = Course::with(['teacher.user', 'students.user'])->get();

        foreach ($courses->shuffle()->take(8) as $i => $course) {
            $host = $course->teacher?->user;
            if (! $host) {
                continue;
            }

            $meeting = VirtualMeeting::create([
                'title' => 'Séance de révision — '.$course->name,
                'description' => 'Révision interactive avant le contrôle — '.$course->grade_level.'.',
                'course_id' => $course->id,
                'created_by' => $host->id,
                'jitsi_room_name' => $jitsi->generateRoomName($course->code),
                'scheduled_at' => now()->addDays(2 + $i)->setTime(17, 0),
                'ends_at' => now()->addDays(2 + $i)->setTime(18, 30),
                'status' => VirtualMeeting::STATUS_SCHEDULED,
            ]);

            MeetingParticipant::create([
                'virtual_meeting_id' => $meeting->id,
                'user_id' => $host->id,
                'role' => MeetingParticipant::ROLE_HOST,
                'invited_at' => now(),
            ]);

            foreach ($course->students->take(6) as $student) {
                MeetingParticipant::create([
                    'virtual_meeting_id' => $meeting->id,
                    'user_id' => $student->user_id,
                    'role' => MeetingParticipant::ROLE_PARTICIPANT,
                    'invited_at' => now(),
                ]);
            }
        }
    }

    protected function seedAnnouncementsAndEvents(): void
    {
        $admin = User::where('email', FreshDeploymentService::SUPER_ADMIN_EMAIL)->first();
        if (! $admin) {
            return;
        }

        $announcements = [
            ['title' => 'Bienvenue — Semestre de printemps 2025', 'content' => 'Bienvenue à tous les élèves (Grades 9 à 12) et enseignants. Consultez vos emplois du temps sur le portail.', 'target_role' => null],
            ['title' => 'Calendrier des examens partiels', 'content' => 'Le calendrier des examens partiels est publié pour toutes les classes.', 'target_role' => 'student'],
            ['title' => 'Réunion pédagogique', 'content' => 'Réunion du corps enseignant vendredi à 15h00 — toutes les filières.', 'target_role' => 'teacher'],
            ['title' => 'Rencontres parents-enseignants', 'content' => 'Les rencontres parents-enseignants auront lieu fin du mois pour les classes 9 à 12.', 'target_role' => 'parent'],
        ];

        foreach ($announcements as $data) {
            Announcement::create([
                ...$data,
                'is_published' => true,
                'published_at' => now()->subDays(rand(1, 10)),
                'created_by' => $admin->id,
            ]);
        }

        $events = [
            ['title' => 'Examens partiels — Toutes classes', 'type' => 'exam', 'color' => '#ef4444', 'days' => 14],
            ['title' => 'Réunion équipe pédagogique', 'type' => 'meeting', 'color' => '#6366f1', 'days' => 7],
            ['title' => 'Vacances de printemps', 'type' => 'holiday', 'color' => '#22c55e', 'days' => 30],
            ['title' => 'Journée portes ouvertes', 'type' => 'event', 'color' => '#f59e0b', 'days' => 21],
        ];

        foreach ($events as $data) {
            Event::create([
                'title' => $data['title'],
                'description' => $data['title'],
                'start_date' => now()->addDays($data['days'])->setTime(8, 0),
                'end_date' => now()->addDays($data['days'] + 1)->setTime(17, 0),
                'type' => $data['type'],
                'color' => $data['color'],
                'is_public' => true,
                'created_by' => $admin->id,
            ]);
        }
    }

    protected function seedNotifications(): void
    {
        $service = app(NotificationService::class);
        $grades = Grade::with(['student.user', 'course'])->inRandomOrder()->limit(25)->get();

        foreach ($grades as $grade) {
            if ($grade->student?->user) {
                $service->notifyGradePosted($grade);
            }
        }

        $students = Student::with('user')->inRandomOrder()->limit(12)->get();
        foreach ($students as $student) {
            if ($student->user) {
                $service->notifyUser(
                    $student->user,
                    NotificationService::CATEGORY_SYSTEM,
                    'Rappel de devoir',
                    'N\'oubliez pas de consulter vos devoirs en cours sur le portail.',
                    ['type' => 'assignment_reminder']
                );
            }
        }
    }

    protected function createUser(string $name, string $email, string $role, ?string $phone = null): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => $this->password,
            'phone' => $phone,
            'email_verified_at' => now(),
        ]);
        $user->forceFill(['role' => $role, 'is_active' => true])->save();

        return $user->fresh();
    }

    protected function emailFor(string $name, string $domain): string
    {
        $slug = Str::slug(str_replace(['El ', 'Ait '], ['el-', 'ait-'], $name), '.');

        return $slug.'@'.$domain;
    }

    protected function realisticScore(string $studentName, string $courseCode): float
    {
        $base = crc32($studentName.$courseCode) % 8;

        return min(20, max(8, 11 + $base + (rand(0, 30) / 10))) * 5;
    }
}
