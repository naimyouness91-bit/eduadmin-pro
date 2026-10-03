<?php

namespace App\Services;

use App\Exceptions\QuizGenerationException;
use App\Models\CourseAiQuiz;
use App\Models\CourseAiQuizQuestion;
use App\Models\CourseQuizDocument;
use Illuminate\Support\Str;

class CourseAiQuizGeneratorService
{
    public const MIN_SOURCE_CHARS = 120;

    public const MIN_UNIQUE_WORDS = 25;

    public const GENERATOR_MODE = 'local';

    public const GENERATOR_LABEL = 'Local AI Quiz Generator Mode';

    public function __construct(
        protected CourseDocumentTextExtractor $textExtractor,
        protected LocalQuizEngine $localEngine
    ) {}

    public function generatorMode(): string
    {
        return self::GENERATOR_MODE;
    }

    public function generatorLabel(): string
    {
        return self::GENERATOR_LABEL;
    }

    /**
     * @param  array<int, string>  $questionTypes
     * @return array<int, array<string, mixed>>
     */
    public function previewQuestions(
        string $sourceText,
        string $title,
        string $difficulty,
        int $questionCount,
        array $questionTypes
    ): array {
        $this->validateSourceContent($sourceText);

        return $this->generateQuestions(
            $sourceText,
            $title,
            $difficulty,
            $questionCount,
            $questionTypes
        );
    }

    /**
     * @param  array<int, string>  $questionTypes
     * @return array<int, array<string, mixed>>
     */
    public function generateQuestions(
        string $sourceText,
        string $title,
        string $difficulty,
        int $questionCount,
        array $questionTypes
    ): array {
        $questionTypes = $this->normalizeQuestionTypes($questionTypes);
        $questionCount = $this->normalizeQuestionCount($questionCount);
        $difficulty = $this->normalizeDifficulty($difficulty);

        $this->validateSourceContent($sourceText);

        $questions = $this->generateLocalQuestions(
            $sourceText,
            $title,
            $difficulty,
            $questionCount,
            $questionTypes
        );

        $minimum = min(3, $questionCount);
        if (count($questions) < $minimum) {
            throw new QuizGenerationException(
                sprintf(
                    'Only %d of %d questions could be generated from this material. Try a longer document, reduce the question count, or adjust question types.',
                    count($questions),
                    $questionCount
                ),
                'insufficient_questions'
            );
        }

        return array_slice($questions, 0, $questionCount);
    }

    /**
     * @param  array<int, string>  $questionTypes
     * @return array<int, array<string, mixed>>
     */
    protected function generateLocalQuestions(
        string $sourceText,
        string $title,
        string $difficulty,
        int $questionCount,
        array $questionTypes
    ): array {
        $questions = [];
        $seed = 0;

        while (count($questions) < $questionCount && $seed < 6) {
            $needed = $questionCount - count($questions);
            $batch = $this->localEngine->generate(
                $sourceText,
                $title.' #'.($seed + 1),
                $difficulty,
                $needed + 2,
                $questionTypes
            );

            $sanitized = $this->sanitizeQuestions($batch, $needed + 2, $questionTypes);

            foreach ($sanitized as $candidate) {
                if ($this->isDuplicateQuestion($candidate['question'], $questions)) {
                    continue;
                }
                $questions[] = $candidate;
                if (count($questions) >= $questionCount) {
                    break;
                }
            }

            $seed++;
        }

        return $this->deduplicateQuestions($questions);
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $prebuiltQuestions
     * @param  array<int, string>  $questionTypes
     */
    public function createQuizFromDocument(
        CourseQuizDocument $document,
        string $difficulty,
        int $questionCount,
        array $questionTypes,
        ?string $title = null,
        ?array $prebuiltQuestions = null
    ): CourseAiQuiz {
        $document = $this->ensureDocumentText($document);

        $quizTitle = $title ?: pathinfo($document->original_filename, PATHINFO_FILENAME).' Quiz';
        $questionTypes = $this->normalizeQuestionTypes($questionTypes);
        $questionCount = $this->normalizeQuestionCount($questionCount);
        $difficulty = $this->normalizeDifficulty($difficulty);

        if ($prebuiltQuestions !== null) {
            $questions = $this->validatePrebuiltQuestions(
                $prebuiltQuestions,
                $questionCount,
                $questionTypes
            );
        } else {
            $questions = $this->generateQuestions(
                $document->extracted_text,
                $quizTitle,
                $difficulty,
                $questionCount,
                $questionTypes
            );
        }

        return $this->persistQuiz(
            $document,
            $quizTitle,
            $difficulty,
            $questionTypes,
            $questions
        );
    }

    protected function ensureDocumentText(CourseQuizDocument $document): CourseQuizDocument
    {
        if ($document->extraction_status === CourseQuizDocument::STATUS_COMPLETED && ! empty($document->extracted_text)) {
            return $document;
        }

        $result = $this->textExtractor->extractFromDisk($document->disk_path);
        if ($result['error']) {
            $document->update([
                'extraction_status' => CourseQuizDocument::STATUS_FAILED,
                'extraction_error' => $result['error'],
            ]);
            throw new QuizGenerationException($result['error'], 'extraction_failed');
        }

        $document->update([
            'extracted_text' => $result['text'],
            'extraction_status' => CourseQuizDocument::STATUS_COMPLETED,
            'extraction_error' => null,
        ]);

        return $document->refresh();
    }

    /**
     * @param  array<int, array<string, mixed>>  $questions
     * @param  array<int, string>  $questionTypes
     */
    protected function persistQuiz(
        CourseQuizDocument $document,
        string $quizTitle,
        string $difficulty,
        array $questionTypes,
        array $questions
    ): CourseAiQuiz {
        $quiz = CourseAiQuiz::create([
            'course_id' => $document->course_id,
            'teacher_id' => $document->teacher_id,
            'document_id' => $document->id,
            'title' => $quizTitle,
            'difficulty' => $difficulty,
            'question_count' => count($questions),
            'question_types' => $questionTypes,
            'status' => CourseAiQuiz::STATUS_DRAFT,
            'ai_provider' => self::GENERATOR_MODE,
        ]);

        foreach ($questions as $index => $q) {
            CourseAiQuizQuestion::create([
                'quiz_id' => $quiz->id,
                'sort_order' => $index + 1,
                'type' => $q['type'],
                'question' => $q['question'],
                'options' => $q['options'] ?? null,
                'correct_answer' => $q['correct_answer'],
                'explanation' => $q['explanation'] ?? null,
                'points' => 1,
            ]);
        }

        return $quiz->load(['questions', 'course', 'document']);
    }

    public function validateSourceContent(string $sourceText): void
    {
        $text = trim($sourceText);

        if (strlen($text) < self::MIN_SOURCE_CHARS) {
            throw new QuizGenerationException(
                'The source material is too short. Upload a document with at least a few paragraphs of course content.',
                'content_too_short'
            );
        }

        $words = preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $unique = array_unique(array_map('mb_strtolower', $words));

        if (count($unique) < self::MIN_UNIQUE_WORDS) {
            throw new QuizGenerationException(
                'The extracted text does not contain enough unique vocabulary to generate meaningful questions. Try a richer PDF or DOCX file.',
                'content_too_poor'
            );
        }
    }

    /**
     * @param  array<int, mixed>  $raw
     * @param  array<int, string>  $allowedTypes
     * @return array<int, array<string, mixed>>
     */
    protected function sanitizeQuestions(array $raw, int $expectedCount, array $allowedTypes): array
    {
        $out = [];

        foreach ($raw as $item) {
            if (! is_array($item)) {
                continue;
            }

            $sanitized = $this->sanitizeSingleQuestion($item, $allowedTypes);
            if ($sanitized === null) {
                continue;
            }

            if ($this->isDuplicateQuestion($sanitized['question'], $out)) {
                continue;
            }

            $out[] = $sanitized;

            if (count($out) >= $expectedCount) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<int, string>  $allowedTypes
     * @return array<string, mixed>|null
     */
    protected function sanitizeSingleQuestion(array $item, array $allowedTypes): ?array
    {
        $question = trim((string) ($item['question'] ?? ''));
        if (strlen($question) < 10) {
            return null;
        }

        if ($this->looksAbsurd($question)) {
            return null;
        }

        $type = $item['type'] ?? CourseAiQuizQuestion::TYPE_MCQ;
        if (! in_array($type, $allowedTypes, true)) {
            $type = $allowedTypes[0];
        }

        $explanation = trim((string) ($item['explanation'] ?? ''));
        if ($explanation === '') {
            $explanation = 'Refer to the course material for details.';
        }

        return match ($type) {
            CourseAiQuizQuestion::TYPE_TRUE_FALSE => $this->sanitizeTrueFalse($question, $item, $explanation),
            CourseAiQuizQuestion::TYPE_SHORT_ANSWER => $this->sanitizeShortAnswer($question, $item, $explanation),
            default => $this->sanitizeMcq($question, $item, $explanation),
        };
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    protected function sanitizeMcq(string $question, array $item, string $explanation): ?array
    {
        $options = $this->normalizeMcqOptions($item['options'] ?? []);
        $values = array_values(array_filter($options, fn ($v) => strlen(trim($v)) > 0));

        if (count($values) < 4 || count(array_unique(array_map('mb_strtolower', $values))) < 4) {
            return null;
        }

        if ($this->hasPlaceholderOptions($options)) {
            return null;
        }

        $correct = $this->resolveMcqCorrectAnswer($item['correct_answer'] ?? '', $options);
        if ($correct === null) {
            return null;
        }

        return [
            'type' => CourseAiQuizQuestion::TYPE_MCQ,
            'question' => $question,
            'options' => $options,
            'correct_answer' => $correct,
            'explanation' => $explanation,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    protected function sanitizeTrueFalse(string $question, array $item, string $explanation): ?array
    {
        $answer = Str::lower(trim((string) ($item['correct_answer'] ?? '')));
        if (! in_array($answer, ['true', 'false'], true)) {
            return null;
        }

        return [
            'type' => CourseAiQuizQuestion::TYPE_TRUE_FALSE,
            'question' => $question,
            'options' => null,
            'correct_answer' => ucfirst($answer),
            'explanation' => $explanation,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    protected function sanitizeShortAnswer(string $question, array $item, string $explanation): ?array
    {
        $answer = trim((string) ($item['correct_answer'] ?? ''));
        if ($answer === '' || str_word_count($answer) > 8) {
            return null;
        }

        return [
            'type' => CourseAiQuizQuestion::TYPE_SHORT_ANSWER,
            'question' => $question,
            'options' => null,
            'correct_answer' => $answer,
            'explanation' => $explanation,
        ];
    }

    /**
     * @param  array<string, string>  $options
     */
    protected function resolveMcqCorrectAnswer(string $raw, array $options): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        $letter = strtoupper($raw);
        if (preg_match('/^[A-D]$/', $letter) && isset($options[$letter])) {
            return $letter;
        }

        foreach ($options as $key => $label) {
            if (Str::lower(trim($label)) === Str::lower($raw)) {
                return $key;
            }
        }

        return null;
    }

    /**
     * @param  array<string, string>  $options
     */
    protected function hasPlaceholderOptions(array $options): bool
    {
        $placeholders = ['option a', 'option b', 'option c', 'option d', 'first option', 'second option'];

        foreach ($options as $label) {
            if (in_array(Str::lower(trim($label)), $placeholders, true)) {
                return true;
            }
        }

        return false;
    }

    protected function looksAbsurd(string $question): bool
    {
        $lower = Str::lower($question);

        return Str::contains($lower, [
            'unrelated concept',
            'opposite meaning',
            'none of the above',
            'according to the course material for',
            'true or false (easy)',
            'true or false (medium)',
            'true or false (hard)',
            'short answer (easy)',
            'short answer (medium)',
            'short answer (hard)',
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $existing
     */
    protected function isDuplicateQuestion(string $question, array $existing): bool
    {
        foreach ($existing as $item) {
            if ($this->questionsAreSimilar($question, $item['question'])) {
                return true;
            }
        }

        return false;
    }

    protected function questionsAreSimilar(string $a, string $b): bool
    {
        $na = $this->normalizeForComparison($a);
        $nb = $this->normalizeForComparison($b);

        if ($na === $nb) {
            return true;
        }

        similar_text($na, $nb, $percent);

        return $percent >= 82;
    }

    protected function normalizeForComparison(string $text): string
    {
        $text = Str::lower($text);
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', '', $text) ?? $text;

        return preg_replace('/\s+/', ' ', trim($text)) ?? '';
    }

    /**
     * @param  array<int, array<string, mixed>>  $questions
     * @return array<int, array<string, mixed>>
     */
    protected function deduplicateQuestions(array $questions): array
    {
        $unique = [];

        foreach ($questions as $q) {
            if (! $this->isDuplicateQuestion($q['question'], $unique)) {
                $unique[] = $q;
            }
        }

        return $unique;
    }

    /**
     * @param  array<int, array<string, mixed>>  $prebuilt
     * @param  array<int, string>  $questionTypes
     * @return array<int, array<string, mixed>>
     */
    protected function validatePrebuiltQuestions(array $prebuilt, int $expectedCount, array $questionTypes): array
    {
        $questions = $this->sanitizeQuestions($prebuilt, $expectedCount, $questionTypes);

        if (count($questions) < $expectedCount) {
            throw new QuizGenerationException(
                'The preview questions are invalid or incomplete. Please regenerate the quiz.',
                'invalid_preview'
            );
        }

        return $questions;
    }

    /**
     * @param  array<int|string, mixed>  $options
     * @return array<string, string>
     */
    protected function normalizeMcqOptions(array $options): array
    {
        $keys = ['A', 'B', 'C', 'D'];
        $normalized = [];

        if (array_is_list($options)) {
            foreach (array_slice($options, 0, 4) as $index => $label) {
                $normalized[$keys[$index]] = trim((string) $label);
            }
        } else {
            $index = 0;
            foreach ($options as $key => $label) {
                if ($index >= 4) {
                    break;
                }
                $optionKey = is_string($key) && preg_match('/^[A-Da-d]$/', $key)
                    ? strtoupper($key)
                    : $keys[$index];
                $normalized[$optionKey] = trim((string) $label);
                $index++;
            }
        }

        foreach ($keys as $key) {
            $normalized[$key] ??= '';
        }

        return $normalized;
    }

    /**
     * @param  array<int, string>  $types
     * @return array<string, int>
     */
    protected function buildTypeDistribution(int $count, array $types): array
    {
        $distribution = array_fill_keys($types, 0);

        for ($i = 0; $i < $count; $i++) {
            $type = $types[$i % count($types)];
            $distribution[$type]++;
        }

        return $distribution;
    }

    /**
     * @param  array<int, string>  $types
     * @return array<int, string>
     */
    public function normalizeQuestionTypes(array $types): array
    {
        $valid = [
            CourseAiQuizQuestion::TYPE_MCQ,
            CourseAiQuizQuestion::TYPE_TRUE_FALSE,
            CourseAiQuizQuestion::TYPE_SHORT_ANSWER,
        ];

        $types = array_values(array_intersect($types, $valid));

        return empty($types) ? $valid : $types;
    }

    public function normalizeQuestionCount(int $count): int
    {
        return in_array($count, [5, 10, 15, 20], true) ? $count : 10;
    }

    public function normalizeDifficulty(string $difficulty): string
    {
        return in_array($difficulty, [
            CourseAiQuiz::DIFFICULTY_EASY,
            CourseAiQuiz::DIFFICULTY_MEDIUM,
            CourseAiQuiz::DIFFICULTY_HARD,
        ], true) ? $difficulty : CourseAiQuiz::DIFFICULTY_MEDIUM;
    }
}
