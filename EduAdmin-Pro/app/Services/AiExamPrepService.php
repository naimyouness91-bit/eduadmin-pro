<?php

namespace App\Services;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AiExamPrepService
{
    public const TOPIC = 'exam_prep';

    public const PROMPT_QUIZ = 'quiz';

    public const PROMPT_EXPLAIN = 'explain';

    public const PROMPT_SUMMARY = 'summary';

    public const PROMPT_REVISION = 'revision_plan';

    public const PROMPT_WEAK = 'weak_subjects';

    public const PROMPT_RESOURCES = 'resources';

    public function __construct(
        protected StudentExamContextService $contextService
    ) {}

    /**
     * @return array<int, array<string, string>>
     */
    public function suggestedPrompts(Student $student): array
    {
        $courses = $student->courses()->pluck('name')->take(3)->all();
        $sampleCourse = $courses[0] ?? 'your course';

        return [
            [
                'id' => self::PROMPT_QUIZ,
                'label' => 'Generate quiz',
                'prompt' => "Generate a 5-question practice quiz with answers for: {$sampleCourse}. Mix multiple choice and short answer.",
            ],
            [
                'id' => self::PROMPT_EXPLAIN,
                'label' => 'Explain a topic',
                'prompt' => 'Explain the hardest concept from my recent lessons in simple steps with one example.',
            ],
            [
                'id' => self::PROMPT_SUMMARY,
                'label' => 'Lesson summary',
                'prompt' => "Create a concise study summary (key points + definitions) for: {$sampleCourse}.",
            ],
            [
                'id' => self::PROMPT_REVISION,
                'label' => 'Revision plan',
                'prompt' => 'Build a 7-day exam revision plan based on my weak subjects and enrolled courses.',
            ],
            [
                'id' => self::PROMPT_WEAK,
                'label' => 'Weak subjects',
                'prompt' => 'Analyze my grades and list my weak subjects with specific improvement tips.',
            ],
            [
                'id' => self::PROMPT_RESOURCES,
                'label' => 'Study resources',
                'prompt' => 'Recommend study resources (videos, practice, techniques) for my weakest subject.',
            ],
        ];
    }

    public function generateReply(
        Student $student,
        AiConversation $conversation,
        string $userMessage,
        ?string $promptType = null,
        bool $educationalMode = false
    ): string {
        $context = $this->contextService->buildContext($student);
        $type = $promptType ?: $this->inferPromptType($userMessage);
        $messages = $conversation->messages;
        $historyMessages = $messages->isNotEmpty() && $messages->last()->role === 'user'
            ? $messages->slice(0, -1)
            : $messages;
        $history = $this->formatHistory($historyMessages);

        $apiKey = config('services.openai.api_key');

        if ($apiKey) {
            $reply = $this->callOpenAi($userMessage, $type, $context, $history, $educationalMode);

            if ($reply !== null) {
                return $reply;
            }
        }

        return $this->fallbackReply($userMessage, $type, $context, $educationalMode);
    }

    protected function inferPromptType(string $message): string
    {
        $lower = Str::lower($message);

        if (Str::contains($lower, ['quiz', 'question', 'mcq', 'test me'])) {
            return self::PROMPT_QUIZ;
        }

        if (Str::contains($lower, ['explain', 'difficult', 'hard topic', 'don\'t understand'])) {
            return self::PROMPT_EXPLAIN;
        }

        if (Str::contains($lower, ['summary', 'summarize', 'key points'])) {
            return self::PROMPT_SUMMARY;
        }

        if (Str::contains($lower, ['revision', 'study plan', 'schedule', '7-day', '7 day'])) {
            return self::PROMPT_REVISION;
        }

        if (Str::contains($lower, ['weak', 'struggling', 'low grade', 'improve'])) {
            return self::PROMPT_WEAK;
        }

        if (Str::contains($lower, ['resource', 'video', 'book', 'recommend', 'where to study'])) {
            return self::PROMPT_RESOURCES;
        }

        return 'general';
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array<int, array{role: string, content: string}>  $history
     */
    protected function callOpenAi(
        string $userMessage,
        string $promptType,
        array $context,
        array $history,
        bool $educationalMode = false
    ): ?string {
        $messages = [
            ['role' => 'system', 'content' => $this->systemPrompt($promptType, $context, $educationalMode)],
        ];

        foreach (array_slice($history, -12) as $item) {
            $messages[] = $item;
        }

        $messages[] = ['role' => 'user', 'content' => $userMessage];

        try {
            $response = Http::withToken(config('services.openai.api_key'))
                ->timeout((int) config('services.openai.timeout', 60))
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'messages' => $messages,
                    'temperature' => 0.7,
                    'max_tokens' => 1800,
                ]);

            if (! $response->successful()) {
                return null;
            }

            return trim($response->json('choices.0.message.content') ?? '') ?: null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function systemPrompt(string $promptType, array $context, bool $educationalMode = false): string
    {
        $json = json_encode($context, JSON_UNESCAPED_UNICODE);

        $task = match ($promptType) {
            self::PROMPT_QUIZ => 'Generate a clear practice quiz with numbered questions, options where relevant, and an Answer Key section at the end.',
            self::PROMPT_EXPLAIN => 'Explain the topic in simple language with steps, analogies, and a short recap.',
            self::PROMPT_SUMMARY => 'Produce a structured lesson summary with headings, bullet key points, and must-know definitions.',
            self::PROMPT_REVISION => 'Create a day-by-day revision plan (7 days) with time blocks, focus topics, and quick checks.',
            self::PROMPT_WEAK => 'List weak subjects from the student data, why they matter, and 3 actionable fixes per subject.',
            self::PROMPT_RESOURCES => 'Recommend specific study resources (types, platforms, practice methods) tailored to weak areas.',
            default => 'Act as an exam preparation tutor. Be encouraging, structured, and practical.',
        };

        if ($educationalMode) {
            return <<<PROMPT
You are EduAdmin Pro AI Study Assistant — **Educational Mode only**.

STRICT RULES:
- Answer ONLY educational and study-related requests.
- Allowed domains: mathematics, programming, databases, Laravel, web development, science (physics, chemistry, biology), languages, history, algorithms, exam preparation, homework help, study support.
- Allowed tasks: explain lessons, summaries, quizzes, study plans, concept explanations, learning resources, exam prep.
- If the user asks about politics, gambling, adult content, illegal activity, sports predictions, entertainment, or any non-educational topic, reply EXACTLY with: "I am designed to help with educational topics and study support." — nothing else.

Task: {$task}
Use the student's profile JSON when relevant: {$json}
Format responses in Markdown. Keep answers focused and study-ready.
PROMPT;
        }

        return <<<PROMPT
You are EduAdmin Pro AI Exam Preparation Center — a friendly tutor for secondary/university students.
Task: {$task}
Use the student's profile JSON when relevant (grades, courses, weak subjects): {$json}
Format responses in Markdown. Keep answers focused and study-ready.
PROMPT;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, AiMessage>  $messages
     * @return array<int, array{role: string, content: string}>
     */
    protected function formatHistory(Collection $messages): array
    {
        return $messages->map(fn (AiMessage $m) => [
            'role' => $m->role === 'assistant' ? 'assistant' : 'user',
            'content' => $m->content,
        ])->values()->all();
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function fallbackReply(
        string $userMessage,
        string $promptType,
        array $context,
        bool $educationalMode = false
    ): string {
        $name = $context['student_name'] ?? 'Student';
        $courses = $context['courses'] ?? [];
        $courseList = $courses ? implode(', ', $courses) : 'your enrolled courses';
        $weak = $context['weak_subjects'] ?? [];

        if ($educationalMode && $promptType === 'general') {
            return $this->fallbackEducationalGeneral($name, $userMessage, $weak, $courseList);
        }

        return match ($promptType) {
            self::PROMPT_QUIZ => $this->fallbackQuiz($userMessage, $courseList),
            self::PROMPT_EXPLAIN => $this->fallbackExplain($userMessage),
            self::PROMPT_SUMMARY => $this->fallbackSummary($userMessage, $courseList),
            self::PROMPT_REVISION => $this->fallbackRevisionPlan($name, $weak, $courses),
            self::PROMPT_WEAK => $this->fallbackWeakSubjects($weak, $context['recent_grades'] ?? []),
            self::PROMPT_RESOURCES => $this->fallbackResources($weak, $courseList),
            default => $this->fallbackGeneral($name, $userMessage, $weak),
        };
    }

    protected function fallbackQuiz(string $topic, string $courses): string
    {
        $subject = trim($topic) !== '' ? $topic : $courses;

        return <<<MD
## Practice Quiz — {$subject}

**1.** Define the core concept from your latest lesson in one sentence.
- A) Option A
- B) Option B
- C) Option C
- D) Option D

**2.** Solve a typical exam problem step-by-step (show your work).

**3.** Identify the most common mistake students make on this topic and how to avoid it.

**4.** Short answer: compare two related ideas from the unit.

**5.** Application: explain how this topic appears in a real-world scenario.

### Answer Key
1. Review your class notes for the precise definition.
2. Follow: read → plan → solve → check units.
3. Watch for sign errors / missing steps.
4. Use a comparison table (similarities vs differences).
5. Link theory to one everyday example.

*Tip: Time yourself — 8 minutes per question.*
MD;
    }

    protected function fallbackExplain(string $topic): string
    {
        return <<<MD
## Simple Explanation

**Topic:** {$topic}

### Step 1 — Big picture
Think of this topic as a tool: it helps you solve a specific type of exam question.

### Step 2 — Break it down
- **Key idea:** name the rule/formula/concept.
- **When to use it:** list 2 situations from your syllabus.
- **How to apply:** write the steps you follow on paper.

### Step 3 — Example
Work one easy example slowly, then one harder exam-style question.

### Step 4 — Quick check
Can you explain it to a friend without looking at notes? If yes, you are ready to practice.
MD;
    }

    protected function fallbackSummary(string $topic, string $courses): string
    {
        return <<<MD
## Study Summary

**Focus:** {$topic}
**Courses:** {$courses}

### Key points
- Review learning objectives from the unit outline.
- List formulas, definitions, and vocabulary.
- Mark topics that appeared in homework or quizzes.

### Must-know definitions
- Term 1 — one-line definition
- Term 2 — one-line definition
- Term 3 — one-line definition

### 20-minute review routine
1. Skim notes (5 min)
2. Active recall — close book, write what you remember (10 min)
3. Fix gaps with textbook/teacher material (5 min)
MD;
    }

    /**
     * @param  array<int, array<string, mixed>>  $weak
     * @param  array<int, string>  $courses
     */
    protected function fallbackRevisionPlan(string $name, array $weak, array $courses): string
    {
        $focus = $weak
            ? collect($weak)->pluck('course')->take(3)->implode(', ')
            : (implode(', ', array_slice($courses, 0, 3)) ?: 'all subjects');

        return <<<MD
## 7-Day Revision Plan for {$name}

**Priority focus:** {$focus}

| Day | Focus | Tasks |
|-----|--------|--------|
| **Day 1** | Diagnostics | List weak topics; redo 3 past mistakes |
| **Day 2** | Core theory | Summaries + flashcards |
| **Day 3** | Practice set A | Timed questions (45 min) |
| **Day 4** | Weak subject drill | Extra exercises on lowest averages |
| **Day 5** | Practice set B | Mixed exam paper |
| **Day 6** | Review & teach-back | Explain topics aloud without notes |
| **Day 7** | Light recap | Sleep well; skim formula sheet only |

**Daily habit:** 2 × 25-minute Pomodoro blocks + 5-minute break.
MD;
    }

    /**
     * @param  array<int, array<string, mixed>>  $weak
     * @param  array<int, array<string, mixed>>  $recentGrades
     */
    protected function fallbackWeakSubjects(array $weak, array $recentGrades): string
    {
        if (empty($weak)) {
            return "## Weak Subjects\n\nBased on your current grades, no subject is below 75% average — great work! Keep practicing with past papers to stay exam-ready.";
        }

        $lines = ["## Weak Subjects Analysis\n"];

        foreach ($weak as $item) {
            $priority = $item['priority'] === 'high' ? '🔴 High' : '🟡 Medium';
            $lines[] = "### {$item['course']} ({$item['average_percentage']}% avg) — {$priority}";
            $lines[] = '- Review last 3 graded assignments';
            $lines[] = '- Do 10 targeted practice questions';
            $lines[] = '- Ask your teacher to clarify one recurring error';
            $lines[] = '';
        }

        if (! empty($recentGrades)) {
            $lines[] = '### Recent performance';
            foreach (array_slice($recentGrades, 0, 5) as $g) {
                $lines[] = "- **{$g['course']}** — {$g['title']}: {$g['percentage']}%";
            }
        }

        return implode("\n", $lines);
    }

    protected function fallbackResources(array $weak, string $courses): string
    {
        $subject = $weak[0]['course'] ?? $courses;

        return <<<MD
## Recommended Study Resources — {$subject}

### Practice
- Past exam papers (timed, 45–60 min)
- Textbook end-of-chapter questions
- Teacher-provided worksheets

### Learning
- **Khan Academy** / **Coursera** — concept videos
- Official syllabus PDF — tick off each objective
- Study group — explain problems to peers

### Techniques
- **Active recall** — hide notes, write answers
- **Spaced repetition** — review at Day 1, 3, 7
- **Error log** — one notebook for mistakes only

### This week
Pick one resource per day and link it to your weakest topic.
MD;
    }

    /**
     * @param  array<int, array<string, mixed>>  $weak
     */
    protected function fallbackGeneral(string $name, string $message, array $weak): string
    {
        $weakHint = empty($weak)
            ? 'Your grades look balanced — maintain with mixed practice tests.'
            : 'Focus extra time on: '.collect($weak)->pluck('course')->implode(', ').'.';

        return <<<MD
Hi **{$name}**! I'm your AI Exam Prep tutor.

You asked: *{$message}*

{$weakHint}

I can help you:
- Generate quizzes from any lesson
- Explain difficult topics
- Build summaries and 7-day revision plans
- Show weak subjects and study resources

Try a suggested prompt below or tell me your subject and exam date.
MD;
    }

    /**
     * @param  array<int, array<string, mixed>>  $weak
     */
    protected function fallbackEducationalGeneral(
        string $name,
        string $message,
        array $weak,
        string $courseList
    ): string {
        $weakHint = empty($weak)
            ? 'Keep practicing across your enrolled courses.'
            : 'Priority subjects: '.collect($weak)->pluck('course')->implode(', ').'.';

        return <<<MD
Hi **{$name}**! I'm your AI Study Assistant in **Educational Mode**.

**Your question:** *{$message}*

{$weakHint}

**Courses:** {$courseList}

### I can help with
- Explaining lessons (e.g. Laravel Middleware, SQL joins)
- Generating quizzes and summaries
- Building study plans and exam preparation
- Homework guidance and difficult concepts
- Learning resource recommendations

Ask an educational question or tap a suggested prompt below.
MD;
    }
}
