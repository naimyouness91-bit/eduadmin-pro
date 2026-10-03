<?php

namespace Tests\Feature\Api;

use App\Models\DataImportJob;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ImportExportTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_teacher_cannot_access_import_export(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/import-export/types')->assertForbidden();
    }

    public function test_admin_can_download_student_template(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->get('/api/import-export/templates/students')
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_invalid_file_type_rejected(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $file = UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf');

        $this->post('/api/import-export/import/students', ['file' => $file], [
            'Accept' => 'application/json',
        ])->assertUnprocessable();
    }

    public function test_missing_headers_fails_import(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $csv = "wrong_column,other\nJohn,john@test.com\n";
        $path = storage_path('app/testing-bad.csv');
        file_put_contents($path, $csv);
        $file = new UploadedFile($path, 'bad.csv', 'text/csv', null, true);

        $response = $this->post('/api/import-export/import/students', ['file' => $file], [
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('data_import_jobs', [
            'status' => DataImportJob::STATUS_FAILED,
        ]);

        @unlink($path);
    }

    public function test_student_import_success_and_duplicate_skip(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $header = 'name,email,password,student_id,grade_level,section';
        $rows = implode("\n", [
            $header,
            'New Student,new.import@student.eduadmin.com,password123,STU-IMP-001,Grade 10,A',
            'Dup Student,new.import@student.eduadmin.com,password123,STU-IMP-002,Grade 10,B',
        ]);
        $path = storage_path('app/testing-students.csv');
        file_put_contents($path, $rows);
        $file = new UploadedFile($path, 'students.csv', 'text/csv', null, true);

        $response = $this->post('/api/import-export/import/students', ['file' => $file], [
            'Accept' => 'application/json',
        ])->assertOk();

        $data = $response->json('data');
        $this->assertSame('completed', $data['status']);
        $this->assertSame(1, $data['success_count']);
        $this->assertGreaterThanOrEqual(1, $data['skipped_count'] + $data['failed_count']);

        $this->assertDatabaseHas('users', ['email' => 'new.import@student.eduadmin.com']);
        $this->assertSame(1, Student::whereHas('user', fn ($q) => $q->where('email', 'new.import@student.eduadmin.com'))->count());

        @unlink($path);
    }

    public function test_admin_can_export_students_excel(): void
    {
        [, $student] = $this->createStudentUser();
        Sanctum::actingAs($this->createAdminUser());

        $this->get('/api/import-export/export/students')
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}
