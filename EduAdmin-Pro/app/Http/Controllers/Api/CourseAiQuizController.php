<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\QuizGenerationException;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseAiQuiz;
use App\Models\CourseAiQuizAttempt;
use App\Models\CourseQuizDocument;
use App\Models\User;
use App\Services\CourseAiQuizGeneratorService;
use App\Services\CourseAiQuizService;
use App\Services\CourseDocumentTextExtractor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CourseAiQuizController extends Controller
{
    public function __construct(
        protected CourseAiQuizService $quizService,
        protected CourseAiQuizGeneratorService $generator,
        protected CourseDocumentTextExtractor $textExtractor
    ) {}

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => [
                'difficulties' => [
                    ['value' => CourseAiQuiz::DIFFICULTY_EASY, 'label' => 'Easy'],
                    ['value' => CourseAiQuiz::DIFFICULTY_MEDIUM, 'label' => 'Medium'],
                    ['value' => CourseAiQuiz::DIFFICULTY_HARD, 'label' => 'Hard'],
                ],
                'question_counts' => [5, 10, 15, 20],
                'question_types' => [
                    ['value' => 'mcq', 'label' => 'Multiple Choice'],
                    ['value' => 'true_false', 'label' => 'True / False'],
                    ['value' => 'short_answer', 'label' => 'Short Answer'],
                ],
                'accepted_extensions' => ['pdf', 'docx', 'doc', 'txt'],
                'max_file_mb' => 10,
                'ai_provider' => CourseAiQuizGeneratorService::GENERATOR_MODE,
                'generator_mode' => CourseAiQuizGeneratorService::GENERATOR_MODE,
                'generator_label' => CourseAiQuizGeneratorService::GENERATOR_LABEL,
            ],
        ]);
    }

    public function indexDocuments(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->requireTeacher($user);

        $query = CourseQuizDocument::query()->with('course')->latest();

        if ($user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        $docs = $query->paginate($request->integer('per_page', 20));

        $docs->getCollection()->transform(fn ($d) => $this->quizService->formatDocument($d));

        return response()->json($docs);
    }

    public function storeDocument(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->requireTeacher($user);

        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'file' => [
                'required',
                'file',
                'max:10240',
                function (string $attribute, $value, \Closure $fail) {
                    $ext = strtolower($value->getClientOriginalExtension());
                    if (! in_array($ext, ['pdf', 'doc', 'docx', 'txt'], true)) {
                        $fail('The file must be a PDF, DOCX, or TXT document.');
                    }
                },
            ],
        ]);

        $course = Course::findOrFail($data['course_id']);

        if (! $this->quizService->canUploadForCourse($user, $course)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $file = $request->file('file');
        $path = $file->store('course-quiz-documents', 'local');
        $extraction = $this->textExtractor->extractFromUpload($file);

        $document = CourseQuizDocument::create([
            'course_id' => $course->id,
            'teacher_id' => $user->teacher->id,
            'original_filename' => $file->getClientOriginalName(),
            'disk_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'extracted_text' => $extraction['text'] ?: null,
            'extraction_status' => $extraction['error']
                ? CourseQuizDocument::STATUS_FAILED
                : CourseQuizDocument::STATUS_COMPLETED,
            'extraction_error' => $extraction['error'],
        ]);

        return response()->json([
            'message' => $extraction['error']
                ? 'File uploaded but text extraction failed.'
                : 'File uploaded and text extracted.',
            'data' => $this->quizService->formatDocument($document),
        ], 201);
    }

    public function preview(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->requireTeacher($user);

        $data = $request->validate([
            'document_id' => ['required', 'integer', 'exists:course_quiz_documents,id'],
            'difficulty' => ['required', 'string', 'in:easy,medium,hard'],
            'question_count' => ['required', 'integer', 'in:5,10,15,20'],
            'question_types' => ['required', 'array', 'min:1'],
            'question_types.*' => ['string', 'in:mcq,true_false,short_answer'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $document = CourseQuizDocument::with('course')->findOrFail($data['document_id']);

        if (! $this->quizService->canUploadForCourse($user, $document->course)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        try {
            $document = $this->resolveDocumentForGeneration($document);
            $quizTitle = $data['title'] ?? pathinfo($document->original_filename, PATHINFO_FILENAME).' Quiz';

            $questions = $this->generator->previewQuestions(
                $document->extracted_text,
                $quizTitle,
                $data['difficulty'],
                (int) $data['question_count'],
                $data['question_types']
            );

            return response()->json([
                'message' => 'Quiz preview generated successfully.',
                'data' => [
                    'preview' => true,
                    'title' => $quizTitle,
                    'document_id' => $document->id,
                    'difficulty' => $data['difficulty'],
                    'question_count' => count($questions),
                    'question_types' => $this->generator->normalizeQuestionTypes($data['question_types']),
                    'ai_provider' => CourseAiQuizGeneratorService::GENERATOR_MODE,
                    'generator_mode' => CourseAiQuizGeneratorService::GENERATOR_MODE,
                    'generator_label' => CourseAiQuizGeneratorService::GENERATOR_LABEL,
                    'questions' => $this->formatPreviewQuestions($questions),
                ],
            ]);
        } catch (QuizGenerationException $e) {
            return response()->json($e->toArray(), 422);
        }
    }

    public function generate(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->requireTeacher($user);

        $data = $request->validate([
            'document_id' => ['required', 'integer', 'exists:course_quiz_documents,id'],
            'difficulty' => ['required', 'string', 'in:easy,medium,hard'],
            'question_count' => ['required', 'integer', 'in:5,10,15,20'],
            'question_types' => ['required', 'array', 'min:1'],
            'question_types.*' => ['string', 'in:mcq,true_false,short_answer'],
            'title' => ['nullable', 'string', 'max:255'],
            'questions' => ['nullable', 'array', 'min:1'],
            'questions.*.type' => ['required_with:questions', 'string', 'in:mcq,true_false,short_answer'],
            'questions.*.question' => ['required_with:questions', 'string', 'max:2000'],
            'questions.*.options' => ['nullable', 'array'],
            'questions.*.correct_answer' => ['required_with:questions', 'string', 'max:500'],
            'questions.*.explanation' => ['nullable', 'string', 'max:2000'],
        ]);

        $document = CourseQuizDocument::with('course')->findOrFail($data['document_id']);

        if (! $this->quizService->canUploadForCourse($user, $document->course)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        try {
            $quiz = $this->generator->createQuizFromDocument(
                $document,
                $data['difficulty'],
                (int) $data['question_count'],
                $data['question_types'],
                $data['title'] ?? null,
                $data['questions'] ?? null
            );
        } catch (QuizGenerationException $e) {
            return response()->json($e->toArray(), 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Quiz saved successfully.',
            'data' => $this->quizService->formatQuizForTeacher($quiz),
        ], 201);
    }

    protected function resolveDocumentForGeneration(CourseQuizDocument $document): CourseQuizDocument
    {
        if ($document->extraction_status === CourseQuizDocument::STATUS_FAILED && empty($document->extracted_text)) {
            throw new QuizGenerationException(
                $document->extraction_error ?? 'Text extraction failed for this document.',
                'extraction_failed'
            );
        }

        if (empty($document->extracted_text)) {
            $result = $this->textExtractor->extractFromDisk($document->disk_path);
            if ($result['error']) {
                throw new QuizGenerationException($result['error'], 'extraction_failed');
            }
            $document->update([
                'extracted_text' => $result['text'],
                'extraction_status' => CourseQuizDocument::STATUS_COMPLETED,
                'extraction_error' => null,
            ]);
            $document->refresh();
        }

        return $document;
    }

    /**
     * @param  array<int, array<string, mixed>>  $questions
     * @return array<int, array<string, mixed>>
     */
    protected function formatPreviewQuestions(array $questions): array
    {
        return collect($questions)->values()->map(function (array $q, int $index) {
            $formatted = [
                'sort_order' => $index + 1,
                'type' => $q['type'],
                'question' => $q['question'],
                'options' => $q['options'] ?? null,
                'correct_answer' => $q['correct_answer'],
                'explanation' => $q['explanation'] ?? null,
                'points' => 1,
            ];

            if ($q['type'] === 'mcq' && is_array($q['options'] ?? null)) {
                $letter = strtoupper((string) $q['correct_answer']);
                $label = $q['options'][$letter] ?? null;
                $formatted['correct_answer_label'] = $label;
            }

            return $formatted;
        })->all();
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = CourseAiQuiz::query()->with(['course'])->latest();

        if ($user->isStudent() && $user->student) {
            $courseIds = $user->student->courses()->pluck('courses.id');
            $query->where('status', CourseAiQuiz::STATUS_PUBLISHED)
                ->whereIn('course_id', $courseIds);
        } elseif ($user->isTeacher() && $user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user->hasRole(['super_admin', 'admin']) || $user->isParent()) {
            $query->whereRaw('1 = 0');
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('status') && ! $user->isStudent()) {
            $query->where('status', $request->query('status'));
        }

        $quizzes = $query->paginate($request->integer('per_page', 20));

        $quizzes->getCollection()->transform(function (CourseAiQuiz $quiz) use ($user) {
            $item = [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'course_id' => $quiz->course_id,
                'course_name' => $quiz->course?->name,
                'difficulty' => $quiz->difficulty,
                'question_count' => $quiz->question_count,
                'status' => $quiz->status,
                'published_at' => $quiz->published_at,
                'created_at' => $quiz->created_at,
            ];

            if ($user->isStudent() && $user->student) {
                $attempt = CourseAiQuizAttempt::query()
                    ->where('quiz_id', $quiz->id)
                    ->where('student_id', $user->student->id)
                    ->first();
                $item['my_attempt'] = $attempt
                    ? $this->quizService->formatAttemptSummary($attempt)
                    : null;
            }

            return $item;
        });

        return response()->json($quizzes);
    }

    public function show(Request $request, CourseAiQuiz $quiz): JsonResponse
    {
        $user = $request->user();

        if ($this->quizService->canManageQuiz($user, $quiz)) {
            return response()->json([
                'data' => $this->quizService->formatQuizForTeacher($quiz->load(['questions', 'document', 'course'])),
            ]);
        }

        if ($this->quizService->canViewQuizAsStudent($user, $quiz)) {
            $attempt = null;
            if ($user->student) {
                $attempt = CourseAiQuizAttempt::query()
                    ->where('quiz_id', $quiz->id)
                    ->where('student_id', $user->student->id)
                    ->first();
            }

            return response()->json([
                'data' => $this->quizService->formatQuizForStudent($quiz, $attempt),
            ]);
        }

        return response()->json(['message' => 'Forbidden.'], 403);
    }

    public function publish(Request $request, CourseAiQuiz $quiz): JsonResponse
    {
        $user = $request->user();

        if (! $this->quizService->canManageQuiz($user, $quiz)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $quiz->update([
            'status' => CourseAiQuiz::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        return response()->json([
            'message' => 'Quiz published for students.',
            'data' => $this->quizService->formatQuizForTeacher($quiz->fresh(['questions', 'course', 'document'])),
        ]);
    }

    public function destroy(Request $request, CourseAiQuiz $quiz): JsonResponse
    {
        $user = $request->user();

        if (! $this->quizService->canManageQuiz($user, $quiz)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $quiz->delete();

        return response()->json(['message' => 'Quiz deleted.']);
    }

    public function submit(Request $request, CourseAiQuiz $quiz): JsonResponse
    {
        $user = $request->user();

        if (! $this->quizService->canViewQuizAsStudent($user, $quiz)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.answer' => ['nullable', 'string', 'max:2000'],
        ]);

        $attempt = $this->quizService->gradeAttempt($quiz, $user->student, $data['answers']);

        return response()->json([
            'message' => 'Quiz submitted.',
            'data' => $this->quizService->formatAttemptResult($attempt),
        ]);
    }

    public function indexAttempts(Request $request, CourseAiQuiz $quiz): JsonResponse
    {
        $user = $request->user();

        if (! $this->quizService->canManageQuiz($user, $quiz)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $attempts = $quiz->attempts()
            ->with(['student.user'])
            ->latest('submitted_at')
            ->paginate($request->integer('per_page', 20));

        $attempts->getCollection()->transform(
            fn (CourseAiQuizAttempt $attempt) => $this->quizService->formatAttemptForTeacher($attempt)
        );

        return response()->json($attempts);
    }

    public function showAttempt(Request $request, CourseAiQuiz $quiz, CourseAiQuizAttempt $attempt): JsonResponse
    {
        $user = $request->user();

        if ((int) $attempt->quiz_id !== (int) $quiz->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if ($user->isStudent() && $user->student) {
            if ((int) $attempt->student_id !== (int) $user->student->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif (! $this->quizService->canManageQuiz($user, $quiz)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'data' => $this->quizService->formatAttemptResult($attempt->load(['answers.question', 'quiz'])),
        ]);
    }

    protected function requireTeacher(User $user): \App\Models\Teacher
    {
        if ($user->isTeacher() && $user->teacher) {
            return $user->teacher;
        }

        abort(403, 'Teachers only.');
    }
}
