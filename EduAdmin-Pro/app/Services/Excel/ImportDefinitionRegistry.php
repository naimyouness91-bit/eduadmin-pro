<?php

namespace App\Services\Excel;

class ImportDefinitionRegistry
{
    /**
     * @return array<string, array{label: string, required_headers: array<int, string>, optional_headers: array<int, string>, example: array<string, string>}>
     */
    public static function definitions(): array
    {
        return [
            'students' => [
                'label' => 'Students',
                'required_headers' => ['name', 'email', 'password'],
                'optional_headers' => [
                    'student_id', 'grade_level', 'section', 'enrollment_status',
                    'enrollment_date', 'guardian_name', 'guardian_phone', 'guardian_email', 'phone',
                ],
                'example' => [
                    'name' => 'Jane Doe',
                    'email' => 'jane.doe@student.eduadmin.com',
                    'password' => 'password',
                    'student_id' => 'STU20259999',
                    'grade_level' => 'Grade 10',
                    'section' => 'A',
                    'enrollment_status' => 'active',
                    'enrollment_date' => '2025-09-01',
                    'guardian_name' => 'John Doe',
                    'guardian_phone' => '+1 555 0100',
                    'guardian_email' => 'guardian@example.com',
                    'phone' => '+1 555 0101',
                ],
            ],
            'teachers' => [
                'label' => 'Teachers',
                'required_headers' => ['name', 'email', 'password'],
                'optional_headers' => [
                    'teacher_id', 'specialization', 'department', 'qualification',
                    'experience_years', 'employment_type', 'joining_date', 'phone',
                ],
                'example' => [
                    'name' => 'Dr. Alan Smith',
                    'email' => 'alan.smith@eduadmin.com',
                    'password' => 'password',
                    'teacher_id' => 'TCH20259999',
                    'specialization' => 'Mathematics',
                    'department' => 'Science',
                    'qualification' => 'PhD',
                    'experience_years' => '8',
                    'employment_type' => 'full_time',
                    'joining_date' => '2020-08-15',
                    'phone' => '+1 555 0200',
                ],
            ],
            'courses' => [
                'label' => 'Courses',
                'required_headers' => ['name', 'code'],
                'optional_headers' => [
                    'description', 'teacher_email', 'grade_level', 'credits', 'status',
                    'semester', 'academic_year', 'room', 'max_students',
                ],
                'example' => [
                    'name' => 'Advanced Physics',
                    'code' => 'PHY-301',
                    'description' => 'Mechanics and waves',
                    'teacher_email' => 'sarah@eduadmin.com',
                    'grade_level' => 'Grade 11',
                    'credits' => '4',
                    'status' => 'active',
                    'semester' => 'Fall',
                    'academic_year' => '2025-2026',
                    'room' => 'B-204',
                    'max_students' => '30',
                ],
            ],
        ];
    }

    /**
     * @return array<string, array{label: string, headers: array<int, string>}>
     */
    public static function exportDefinitions(): array
    {
        return [
            'students' => [
                'label' => 'Students',
                'headers' => [
                    'Student ID', 'Name', 'Email', 'Phone', 'Grade Level', 'Section',
                    'Enrollment Status', 'Enrollment Date', 'Guardian Name', 'Guardian Phone', 'Guardian Email',
                ],
            ],
            'teachers' => [
                'label' => 'Teachers',
                'headers' => [
                    'Teacher ID', 'Name', 'Email', 'Phone', 'Department', 'Specialization',
                    'Qualification', 'Experience Years', 'Employment Type', 'Joining Date',
                ],
            ],
            'grades' => [
                'label' => 'Grades',
                'headers' => [
                    'Student ID', 'Student Name', 'Course Code', 'Course Name', 'Title', 'Type',
                    'Score', 'Max Score', 'Percentage', 'Graded At', 'Semester', 'Academic Year', 'Feedback',
                ],
            ],
            'attendance' => [
                'label' => 'Attendance',
                'headers' => [
                    'Student ID', 'Student Name', 'Course Code', 'Course Name', 'Date',
                    'Status', 'Method', 'Notes',
                ],
            ],
        ];
    }

    public static function isValidImportType(string $type): bool
    {
        return array_key_exists($type, self::definitions());
    }

    public static function isValidExportType(string $type): bool
    {
        return array_key_exists($type, self::exportDefinitions());
    }
}
