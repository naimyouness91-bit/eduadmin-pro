<?php

namespace Tests\Feature\Api;

use App\Models\CourseAiQuiz;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;
use ZipArchive;

class CourseAiQuizTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    protected function courseMaterial(): string
    {
        return <<<'TXT'
        Laravel Middleware is a mechanism for filtering HTTP requests entering your application.
        Middleware can inspect requests, modify them, or reject them before they reach controllers.
        Common examples include authentication middleware and CSRF protection.
        Database normalization reduces redundancy and improves data integrity in relational schemas.
        SQL JOIN operations combine rows from two or more tables based on related columns.
        A foreign key is a column that links two tables together in a relational database.
        An index is a database structure that speeds up data retrieval on a table.
        TXT;
    }

    public function test_teacher_can_upload_extract_and_generate_quiz(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'Web Dev', 'code' => 'WEB']);

        Sanctum::actingAs($teacherUser);

        $upload = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent(
                'lesson.txt',
                $this->courseMaterial()
            ),
        ])->assertCreated()
            ->assertJsonPath('data.extraction_status', 'completed');

        $documentId = $upload->json('data.id');

        $quiz = $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'medium',
            'question_count' => 5,
            'question_types' => ['mcq', 'true_false', 'short_answer'],
        ])->assertCreated()
            ->assertJsonPath('data.question_count', 5)
            ->assertJsonStructure(['data' => ['questions' => [['id', 'type', 'question', 'correct_answer']]]]);

        $quizId = $quiz->json('data.id');

        $this->postJson("/api/ai-quiz/{$quizId}/publish")->assertOk()
            ->assertJsonPath('data.status', 'published');
    }

    public function test_student_can_submit_quiz_and_view_score(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher, ['name' => 'DB', 'code' => 'DB']);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('notes.txt', $this->courseMaterial()),
        ])->json('data.id');

        $quizId = $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'easy',
            'question_count' => 5,
            'question_types' => ['mcq', 'true_false'],
        ])->json('data.id');

        $this->postJson("/api/ai-quiz/{$quizId}/publish")->assertOk();

        Sanctum::actingAs($teacherUser);
        $teacherQuiz = $this->getJson("/api/ai-quiz/{$quizId}")->assertOk()->json('data');
        $firstQuestion = $teacherQuiz['questions'][0];

        Sanctum::actingAs($studentUser);

        $studentQuiz = $this->getJson("/api/ai-quiz/{$quizId}")->assertOk()->json('data');
        $this->assertArrayNotHasKey('correct_answer', $studentQuiz['questions'][0]);

        $mcqAnswer = $firstQuestion['type'] === 'mcq'
            ? ($firstQuestion['options'][$firstQuestion['correct_answer']] ?? $firstQuestion['correct_answer'])
            : $firstQuestion['correct_answer'];

        $submit = $this->postJson("/api/ai-quiz/{$quizId}/submit", [
            'answers' => [
                ['question_id' => $firstQuestion['id'], 'answer' => $mcqAnswer],
            ],
        ])->assertOk()
            ->assertJsonStructure(['data' => ['score', 'max_score', 'percentage', 'answers']]);

        $attemptId = $submit->json('data.id');

        $this->getJson("/api/ai-quiz/{$quizId}/attempts/{$attemptId}")
            ->assertOk()
            ->assertJsonPath('data.answers.0.is_correct', true);
    }

    public function test_student_cannot_access_unpublished_quiz(): void
    {
        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Storage::fake('local');
        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('draft.txt', $this->courseMaterial()),
        ])->json('data.id');

        $quizId = $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'hard',
            'question_count' => 5,
            'question_types' => ['mcq'],
        ])->json('data.id');

        Sanctum::actingAs($studentUser);
        $this->getJson("/api/ai-quiz/{$quizId}")->assertForbidden();
    }

    public function test_teacher_can_upload_docx_and_extract_text(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $docxPath = $this->makeMinimalDocx($this->courseMaterial());

        $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => new UploadedFile($docxPath, 'lesson.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true),
        ])->assertCreated()
            ->assertJsonPath('data.extraction_status', 'completed');

        @unlink($docxPath);
    }

    public function test_upload_rejects_invalid_file_type(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->create('image.png', 100, 'image/png'),
        ])->assertUnprocessable();
    }

    public function test_admin_cannot_upload_or_generate_quiz(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('notes.txt', $this->courseMaterial()),
        ])->json('data.id');

        Sanctum::actingAs($this->createAdminUser());

        $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('admin.txt', $this->courseMaterial()),
        ])->assertForbidden();

        $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'easy',
            'question_count' => 5,
            'question_types' => ['mcq'],
        ])->assertForbidden();
    }

    public function test_admin_cannot_access_ai_quiz_overview(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->getJson('/api/ai-quiz/admin/overview')->assertNotFound();
        $this->getJson('/api/ai-quiz')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_parent_cannot_list_ai_quizzes(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$parentUser] = $this->createParentUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('notes.txt', $this->courseMaterial()),
        ])->json('data.id');

        $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'easy',
            'question_count' => 5,
            'question_types' => ['mcq'],
        ])->assertCreated();

        Sanctum::actingAs($parentUser);

        $this->getJson('/api/ai-quiz')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_teacher_can_list_student_attempts(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        [$studentUser, $student] = $this->createStudentUser();
        $course = $this->createCourseForTeacher($teacher);
        $student->courses()->attach($course->id, ['status' => 'active', 'enrolled_at' => now()]);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('notes.txt', $this->courseMaterial()),
        ])->json('data.id');

        $quizId = $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'easy',
            'question_count' => 5,
            'question_types' => ['mcq'],
        ])->json('data.id');

        $this->postJson("/api/ai-quiz/{$quizId}/publish")->assertOk();

        $teacherQuiz = $this->getJson("/api/ai-quiz/{$quizId}")->assertOk()->json('data');
        $firstQuestion = $teacherQuiz['questions'][0];

        Sanctum::actingAs($studentUser);

        $mcqAnswer = $firstQuestion['type'] === 'mcq'
            ? ($firstQuestion['options'][$firstQuestion['correct_answer']] ?? $firstQuestion['correct_answer'])
            : $firstQuestion['correct_answer'];

        $this->postJson("/api/ai-quiz/{$quizId}/submit", [
            'answers' => [
                ['question_id' => $firstQuestion['id'], 'answer' => $mcqAnswer],
            ],
        ])->assertOk();

        Sanctum::actingAs($teacherUser);

        $this->getJson("/api/ai-quiz/{$quizId}/attempts")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure(['data' => [['id', 'student_name', 'score', 'max_score', 'percentage']]]);
    }

    public function test_teacher_can_preview_before_save(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('lesson.txt', $this->courseMaterial()),
        ])->json('data.id');

        $preview = $this->postJson('/api/ai-quiz/preview', [
            'document_id' => $documentId,
            'difficulty' => 'medium',
            'question_count' => 5,
            'question_types' => ['mcq', 'true_false', 'short_answer'],
        ])->assertOk()
            ->assertJsonPath('data.preview', true)
            ->assertJsonPath('data.question_count', 5)
            ->assertJsonPath('data.generator_mode', 'local')
            ->assertJsonPath('data.generator_label', 'Local AI Quiz Generator Mode')
            ->json('data');

        $this->postJson('/api/ai-quiz/generate', [
            'document_id' => $documentId,
            'difficulty' => 'medium',
            'question_count' => 5,
            'question_types' => ['mcq', 'true_false', 'short_answer'],
            'questions' => $preview['questions'],
        ])->assertCreated()
            ->assertJsonPath('data.question_count', 5);
    }

    public function test_generation_works_without_api_key(): void
    {
        Storage::fake('local');
        config(['services.openai.api_key' => null]);

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('lesson.txt', $this->courseMaterial()),
        ])->json('data.id');

        $this->getJson('/api/ai-quiz/options')
            ->assertOk()
            ->assertJsonPath('data.generator_mode', 'local')
            ->assertJsonPath('data.generator_label', 'Local AI Quiz Generator Mode')
            ->assertJsonMissingPath('data.ai_configured');

        $this->postJson('/api/ai-quiz/preview', [
            'document_id' => $documentId,
            'difficulty' => 'medium',
            'question_count' => 10,
            'question_types' => ['mcq', 'true_false', 'short_answer'],
        ])->assertOk()
            ->assertJsonPath('data.ai_provider', 'local')
            ->assertJsonCount(10, 'data.questions');
    }

    public function test_local_generator_produces_mixed_question_types(): void
    {
        Storage::fake('local');

        [$teacherUser, $teacher] = $this->createTeacherUser();
        $course = $this->createCourseForTeacher($teacher);

        Sanctum::actingAs($teacherUser);

        $documentId = $this->postJson('/api/ai-quiz/documents', [
            'course_id' => $course->id,
            'file' => UploadedFile::fake()->createWithContent('lesson.txt', $this->courseMaterial()),
        ])->json('data.id');

        $questions = $this->postJson('/api/ai-quiz/preview', [
            'document_id' => $documentId,
            'difficulty' => 'medium',
            'question_count' => 10,
            'question_types' => ['mcq', 'true_false', 'short_answer'],
        ])->assertOk()->json('data.questions');

        $types = collect($questions)->pluck('type')->unique()->sort()->values()->all();
        $this->assertContains('mcq', $types);
        $this->assertContains('true_false', $types);

        foreach ($questions as $q) {
            if ($q['type'] === 'mcq') {
                $this->assertCount(4, $q['options']);
                $this->assertContains($q['correct_answer'], ['A', 'B', 'C', 'D']);
            }
        }
    }

    protected function makeMinimalDocx(string $text): string
    {
        $path = tempnam(sys_get_temp_dir(), 'quiz-docx');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
        $zip->addFromString('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'.htmlspecialchars($text).'</w:t></w:r></w:p></w:body></w:document>');
        $zip->close();

        return $path;
    }
}
