<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseAiQuiz;
use App\Models\CourseAiQuizAttempt;
use App\Models\CourseAiQuizAttemptAnswer;
use App\Models\CourseAiQuizQuestion;
use App\Models\CourseQuizDocument;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Str;

class CourseAiQuizService
{
    public function canManageQuiz(User $user, CourseAiQuiz $quiz): bool
    {
        if ($user->isTeacher() && $user->teacher) {
            return (int) $quiz->teacher_id === (int) $user->teacher->id
                || (int) $quiz->course?->teacher_id === (int) $user->teacher->id;
        }

        return false;
    }

    public function canViewQuizAsStudent(User $user, CourseAiQuiz $quiz): bool
    {
        if (! $user->isStudent() || ! $user->student) {
            return false;
        }

        if (! $quiz->isPublished()) {
            return false;
        }

        return $user->student->courses()->where('courses.id', $quiz->course_id)->exists();
    }

    public function canUploadForCourse(User $user, Course $course): bool
    {
        if ($user->isTeacher() && $user->teacher) {
            return (int) $course->teacher_id === (int) $user->teacher->id;
        }

        return false;
    }

    public function gradeAttempt(CourseAiQuiz $quiz, Student $student, array $answersPayload): CourseAiQuizAttempt
    {
        $quiz->load('questions');

        $existing = CourseAiQuizAttempt::query()
            ->where('quiz_id', $quiz->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existing) {
            $existing->answers()->delete();
            $attempt = $existing;
        } else {
            $attempt = CourseAiQuizAttempt::create([
                'quiz_id' => $quiz->id,
                'student_id' => $student->id,
                'score' => 0,
                'max_score' => 0,
                'percentage' => 0,
            ]);
        }

        $answerMap = collect($answersPayload)->keyBy(fn ($a) => (int) ($a['question_id'] ?? 0));

        $score = 0;
        $maxScore = $quiz->questions->sum('points');

        foreach ($quiz->questions as $question) {
            $submitted = $answerMap->get($question->id);
            $rawAnswer = trim((string) ($submitted['answer'] ?? ''));
            $isCorrect = $this->isAnswerCorrect($question, $rawAnswer);
            $points = $isCorrect ? (int) $question->points : 0;
            $score += $points;

            CourseAiQuizAttemptAnswer::updateOrCreate(
                [
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                ],
                [
                'question_id' => $question->id,
                    'answer' => $rawAnswer,
                    'is_correct' => $isCorrect,
                    'points_earned' => $points,
                ]
            );
        }

        $percentage = $maxScore > 0 ? round(($score / $maxScore) * 100, 2) : 0;

        $attempt->fill([
            'score' => $score,
            'max_score' => $maxScore,
            'percentage' => $percentage,
            'submitted_at' => now(),
        ]);
        $attempt->save();

        return $attempt->load(['answers.question', 'quiz.questions']);
    }

    public function isAnswerCorrect(CourseAiQuizQuestion $question, string $answer): bool
    {
        $expected = trim($question->correct_answer);
        $given = trim($answer);

        if ($given === '') {
            return false;
        }

        if ($question->type === CourseAiQuizQuestion::TYPE_TRUE_FALSE) {
            return Str::lower($given) === Str::lower($expected);
        }

        if ($question->type === CourseAiQuizQuestion::TYPE_MCQ) {
            $options = $question->options ?? [];

            if (preg_match('/^[A-D]$/i', $expected)) {
                $letter = strtoupper($expected);
                if (strtoupper($given) === $letter) {
                    return true;
                }
                $expectedLabel = trim((string) ($options[$letter] ?? ''));
                if ($expectedLabel !== '' && strcasecmp($given, $expectedLabel) === 0) {
                    return true;
                }
            }

            if (Str::lower($given) === Str::lower($expected)) {
                return true;
            }

            foreach ($options as $key => $label) {
                if (Str::lower((string) $key) === Str::lower($given) && Str::lower((string) $label) === Str::lower($expected)) {
                    return true;
                }
                if (Str::lower((string) $label) === Str::lower($given) && Str::lower((string) $label) === Str::lower($expected)) {
                    return true;
                }
            }

            return false;
        }

        return Str::lower($given) === Str::lower($expected)
            || Str::contains(Str::lower($expected), Str::lower($given))
            || Str::contains(Str::lower($given), Str::lower($expected));
    }

    public function formatQuizForTeacher(CourseAiQuiz $quiz): array
    {
        $quiz->loadMissing(['course', 'document', 'questions']);

        return [
            'id' => $quiz->id,
            'title' => $quiz->title,
            'course_id' => $quiz->course_id,
            'course_name' => $quiz->course?->name,
            'difficulty' => $quiz->difficulty,
            'question_count' => $quiz->question_count,
            'question_types' => $quiz->question_types,
            'status' => $quiz->status,
            'published_at' => $quiz->published_at,
            'ai_provider' => $quiz->ai_provider,
            'document' => $quiz->document ? [
                'id' => $quiz->document->id,
                'original_filename' => $quiz->document->original_filename,
            ] : null,
            'questions' => $quiz->questions->map(fn ($q) => $this->formatQuestion($q, true))->values(),
            'created_at' => $quiz->created_at,
        ];
    }

    public function formatQuizForStudent(CourseAiQuiz $quiz, ?CourseAiQuizAttempt $attempt = null): array
    {
        $quiz->loadMissing(['course', 'questions']);

        return [
            'id' => $quiz->id,
            'title' => $quiz->title,
            'course_id' => $quiz->course_id,
            'course_name' => $quiz->course?->name,
            'difficulty' => $quiz->difficulty,
            'question_count' => $quiz->question_count,
            'status' => $quiz->status,
            'questions' => $quiz->questions->map(fn ($q) => $this->formatQuestion($q, false))->values(),
            'my_attempt' => $attempt ? $this->formatAttemptSummary($attempt) : null,
        ];
    }

    public function formatQuestion(CourseAiQuizQuestion $q, bool $includeAnswers): array
    {
        $data = [
            'id' => $q->id,
            'sort_order' => $q->sort_order,
            'type' => $q->type,
            'question' => $q->question,
            'options' => $q->options,
            'points' => $q->points,
        ];

        if ($includeAnswers) {
            $data['correct_answer'] = $q->correct_answer;
            $data['explanation'] = $q->explanation;
        }

        return $data;
    }

    public function formatAttemptResult(CourseAiQuizAttempt $attempt): array
    {
        $attempt->loadMissing(['answers.question', 'quiz']);

        return [
            'id' => $attempt->id,
            'quiz_id' => $attempt->quiz_id,
            'quiz_title' => $attempt->quiz?->title,
            'score' => $attempt->score,
            'max_score' => $attempt->max_score,
            'percentage' => $attempt->percentage,
            'submitted_at' => $attempt->submitted_at,
            'answers' => $attempt->answers->map(function (CourseAiQuizAttemptAnswer $a) {
                return [
                    'question_id' => $a->question_id,
                    'question' => $a->question?->question,
                    'type' => $a->question?->type,
                    'your_answer' => $a->answer,
                    'correct_answer' => $a->question?->correct_answer,
                    'is_correct' => $a->is_correct,
                    'points_earned' => $a->points_earned,
                    'explanation' => $a->question?->explanation,
                    'options' => $a->question?->options,
                ];
            })->values(),
        ];
    }

    public function formatAttemptSummary(CourseAiQuizAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'score' => $attempt->score,
            'max_score' => $attempt->max_score,
            'percentage' => $attempt->percentage,
            'submitted_at' => $attempt->submitted_at,
        ];
    }

    public function formatDocument(CourseQuizDocument $doc): array
    {
        return [
            'id' => $doc->id,
            'course_id' => $doc->course_id,
            'original_filename' => $doc->original_filename,
            'mime_type' => $doc->mime_type,
            'file_size' => $doc->file_size,
            'extraction_status' => $doc->extraction_status,
            'extraction_error' => $doc->extraction_error,
            'text_preview' => $doc->extracted_text ? Str::limit($doc->extracted_text, 200) : null,
            'created_at' => $doc->created_at,
        ];
    }

    public function formatAttemptForTeacher(CourseAiQuizAttempt $attempt): array
    {
        $attempt->loadMissing(['student.user', 'quiz']);

        return [
            'id' => $attempt->id,
            'student_id' => $attempt->student_id,
            'student_name' => $attempt->student?->user?->name,
            'score' => $attempt->score,
            'max_score' => $attempt->max_score,
            'percentage' => $attempt->percentage,
            'submitted_at' => $attempt->submitted_at,
        ];
    }
}
