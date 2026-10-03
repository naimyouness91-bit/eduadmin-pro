<?php

namespace App\Services;

use App\Models\CourseAiQuizQuestion;
use Illuminate\Support\Str;

/**
 * Offline quiz generator — extracts concepts from course text and builds
 * MCQ, True/False, and short-answer questions without external APIs.
 */
class LocalQuizEngine
{
    /** @var array<int, string> */
    protected array $stopWords = [
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one',
        'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old',
        'see', 'two', 'way', 'who', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'this',
        'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'will',
        'other', 'about', 'many', 'then', 'them', 'these', 'some', 'what', 'when', 'make', 'like',
        'time', 'very', 'just', 'know', 'take', 'into', 'year', 'your', 'good', 'could', 'than',
        'also', 'after', 'first', 'well', 'must', 'such', 'where', 'through', 'while', 'during',
        'before', 'between', 'under', 'over', 'more', 'most', 'only', 'same', 'being', 'used',
        'using', 'based', 'include', 'includes', 'including', 'example', 'examples', 'however',
        'therefore', 'because', 'within', 'without', 'should', 'would', 'could', 'might',
    ];

    /**
     * @param  array<int, string>  $questionTypes
     * @return array<int, array<string, mixed>>
     */
    public function generate(
        string $sourceText,
        string $title,
        string $difficulty,
        int $questionCount,
        array $questionTypes
    ): array {
        $analysis = $this->analyzeText($sourceText);
        $distribution = $this->buildTypeQueue($questionCount, $questionTypes);
        $questions = [];
        $usedConcepts = [];

        foreach ($distribution as $index => $type) {
            $question = match ($type) {
                CourseAiQuizQuestion::TYPE_TRUE_FALSE => $this->buildTrueFalse($analysis, $index, $usedConcepts),
                CourseAiQuizQuestion::TYPE_SHORT_ANSWER => $this->buildShortAnswer($analysis, $index, $usedConcepts),
                default => $this->buildMcq($analysis, $title, $difficulty, $index, $usedConcepts),
            };

            if ($question === null) {
                $question = $this->buildFallbackQuestion($analysis, $type, $index, $title);
            }

            if ($question !== null && ! $this->isDuplicate($question['question'], $questions)) {
                $questions[] = $question;
            }
        }

        // Fill remaining slots if some generators returned null
        while (count($questions) < $questionCount) {
            $type = $questionTypes[count($questions) % count($questionTypes)];
            $extra = $this->buildFallbackQuestion($analysis, $type, count($questions) + 100, $title);
            if ($extra === null || $this->isDuplicate($extra['question'], $questions)) {
                break;
            }
            $questions[] = $extra;
        }

        return array_slice($questions, 0, $questionCount);
    }

    /**
     * @return array{
     *   sentences: array<int, string>,
     *   keywords: array<int, string>,
     *   definitions: array<int, array{term: string, definition: string, sentence: string}>,
     *   concepts: array<int, string>
     * }
     */
    protected function analyzeText(string $text): array
    {
        $sentences = $this->splitSentences($text);
        $keywords = $this->extractKeywords($text, $sentences);
        $definitions = $this->extractDefinitions($sentences);
        $concepts = array_values(array_unique(array_merge(
            array_column($definitions, 'term'),
            $keywords
        )));

        return [
            'sentences' => $sentences,
            'keywords' => $keywords,
            'definitions' => $definitions,
            'concepts' => $concepts,
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function splitSentences(string $text): array
    {
        $text = preg_replace("/\r\n|\r/", "\n", $text) ?? $text;
        $chunks = preg_split('/(?<=[.!?])\s+|\n{2,}/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_filter(array_map(function ($s) {
            $s = trim(preg_replace('/\s+/', ' ', $s) ?? '');

            return strlen($s) >= 25 ? $s : null;
        }, $chunks)));
    }

    /**
     * @param  array<int, string>  $sentences
     * @return array<int, string>
     */
    protected function extractKeywords(string $text, array $sentences): array
    {
        $candidates = [];

        // Title-case / acronym terms
        if (preg_match_all('/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*|[A-Z]{2,})\b/u', $text, $matches)) {
            foreach ($matches[1] as $term) {
                $term = trim($term);
                if (strlen($term) >= 3 && ! $this->isStopWord($term)) {
                    $candidates[] = $term;
                }
            }
        }

        // Frequent meaningful words
        $words = preg_split('/\s+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $freq = [];
        foreach ($words as $word) {
            $word = preg_replace('/[^\p{L}\p{N}]/u', '', $word) ?? '';
            if (strlen($word) < 4 || $this->isStopWord($word)) {
                continue;
            }
            $freq[$word] = ($freq[$word] ?? 0) + 1;
        }
        arsort($freq);
        foreach (array_slice(array_keys($freq), 0, 40) as $word) {
            $candidates[] = ucfirst($word);
        }

        // Important nouns from sentence starts
        foreach ($sentences as $sentence) {
            if (preg_match('/^(?:The|A|An)\s+([A-Za-z][\w\s-]{2,30}?)\s+(?:is|are|was|were|means|refers|describes|allows|enables|provides|uses|includes)/iu', $sentence, $m)) {
                $candidates[] = trim($m[1]);
            }
        }

        $unique = [];
        foreach ($candidates as $c) {
            $key = mb_strtolower($c);
            if (! isset($unique[$key]) && strlen($c) >= 3) {
                $unique[$key] = $c;
            }
        }

        return array_values($unique);
    }

    /**
     * @param  array<int, string>  $sentences
     * @return array<int, array{term: string, definition: string, sentence: string}>
     */
    protected function extractDefinitions(array $sentences): array
    {
        $definitions = [];

        $patterns = [
            '/^(.{3,60}?)\s+(?:is|are|was|were|means|refers to|can be defined as|is defined as)\s+(.{10,}?)[.!?]?$/iu',
            '/^(.{3,50}?)\s*:\s*(.{10,}?)[.!?]?$/u',
            '/^(?:The|A|An)\s+(.{3,50}?)\s+(?:is|are|means)\s+(.{10,}?)[.!?]?$/iu',
        ];

        foreach ($sentences as $sentence) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, trim($sentence), $m)) {
                    $term = trim($m[1]);
                    $def = trim(rtrim($m[2], '.'));
                    if (strlen($term) >= 3 && strlen($def) >= 8 && ! $this->isStopWord($term)) {
                        $definitions[] = [
                            'term' => $term,
                            'definition' => Str::limit($def, 120, ''),
                            'sentence' => $sentence,
                        ];
                        break;
                    }
                }
            }
        }

        return $definitions;
    }

    /**
     * @param  array<string, mixed>  $analysis
     * @param  array<int, string>  $usedConcepts
     * @return array<string, mixed>|null
     */
    protected function buildMcq(array $analysis, string $title, string $difficulty, int $index, array &$usedConcepts): ?array
    {
        $definitions = $analysis['definitions'];
        $concepts = $analysis['concepts'];
        $sentences = $analysis['sentences'];

        if (empty($concepts) && empty($sentences)) {
            return null;
        }

        // Prefer definition-based MCQ
        if (! empty($definitions)) {
            $def = $definitions[$index % count($definitions)];
            $term = $def['term'];
            if (in_array(mb_strtolower($term), $usedConcepts, true)) {
                $def = $definitions[($index + 1) % count($definitions)];
                $term = $def['term'];
            }
            $usedConcepts[] = mb_strtolower($term);

            $question = "Which term is defined as: \"{$def['definition']}\"?";
            $correct = $term;
            $distractors = $this->pickDistractors($concepts, $term, 3);

            return $this->assembleMcq($question, $correct, $distractors, "According to the course material, {$def['term']} {$def['definition']}.");
        }

        // Sentence comprehension MCQ
        if (! empty($sentences)) {
            $sentence = $sentences[$index % count($sentences)];
            $keyword = $this->pickKeywordFromSentence($sentence, $concepts);
            if ($keyword === null) {
                return null;
            }
            $usedConcepts[] = mb_strtolower($keyword);

            $question = "In the context of \"{$title}\", which concept is most closely associated with: \"".Str::limit($sentence, 90, '…').'"?';
            $distractors = $this->pickDistractors($concepts, $keyword, 3);

            return $this->assembleMcq($question, $keyword, $distractors, "This is based on: ".Str::limit($sentence, 100, '…'));
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $analysis
     * @param  array<int, string>  $usedConcepts
     */
    protected function buildTrueFalse(array $analysis, int $index, array &$usedConcepts): ?array
    {
        $sentences = $analysis['sentences'];
        if (empty($sentences)) {
            return null;
        }

        $sentence = $sentences[$index % count($sentences)];
        $isTrue = ($index % 2) === 0;

        if ($isTrue) {
            $statement = rtrim($sentence, '.');
            $explanation = 'This statement is supported by the uploaded course material.';
        } else {
            $words = preg_split('/\s+/u', $sentence, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            if (count($words) < 6) {
                return null;
            }
            // Swap a key content word with a distractor concept
            $concepts = $analysis['concepts'];
            if (count($concepts) >= 2) {
                $swap = $concepts[($index + 1) % count($concepts)];
                $words[2] = $swap;
                $statement = implode(' ', array_slice($words, 0, min(20, count($words))));
            } else {
                $statement = 'This course material states that none of the concepts covered apply to the topic.';
            }
            $explanation = 'This modified statement is not accurate according to the source document.';
        }

        return [
            'type' => CourseAiQuizQuestion::TYPE_TRUE_FALSE,
            'question' => $statement,
            'options' => null,
            'correct_answer' => $isTrue ? 'True' : 'False',
            'explanation' => $explanation,
        ];
    }

    /**
     * @param  array<string, mixed>  $analysis
     * @param  array<int, string>  $usedConcepts
     */
    protected function buildShortAnswer(array $analysis, int $index, array &$usedConcepts): ?array
    {
        $definitions = $analysis['definitions'];
        if (! empty($definitions)) {
            $def = $definitions[$index % count($definitions)];
            $usedConcepts[] = mb_strtolower($def['term']);

            return [
                'type' => CourseAiQuizQuestion::TYPE_SHORT_ANSWER,
                'question' => 'What term matches this definition: '.$def['definition'].'?',
                'options' => null,
                'correct_answer' => $def['term'],
                'explanation' => 'The course material defines this term in the uploaded document.',
            ];
        }

        $concepts = $analysis['concepts'];
        if (empty($concepts)) {
            return null;
        }

        $term = $concepts[$index % count($concepts)];
        $usedConcepts[] = mb_strtolower($term);
        $sentences = $analysis['sentences'];
        $context = ! empty($sentences) ? Str::limit($sentences[$index % count($sentences)], 80, '…') : 'the course material';

        return [
            'type' => CourseAiQuizQuestion::TYPE_SHORT_ANSWER,
            'question' => "Name one key concept mentioned in this context: \"{$context}\"",
            'options' => null,
            'correct_answer' => $term,
            'explanation' => "The term \"{$term}\" appears in the uploaded course content.",
        ];
    }

    /**
     * @param  array<string, mixed>  $analysis
     */
    protected function buildFallbackQuestion(array $analysis, string $type, int $index, string $title): ?array
    {
        $sentences = $analysis['sentences'];
        $concepts = $analysis['concepts'];
        if (empty($sentences) || empty($concepts)) {
            return null;
        }

        $sentence = $sentences[$index % count($sentences)];
        $concept = $concepts[$index % count($concepts)];

        return match ($type) {
            CourseAiQuizQuestion::TYPE_TRUE_FALSE => [
                'type' => CourseAiQuizQuestion::TYPE_TRUE_FALSE,
                'question' => Str::limit($sentence, 180, '…'),
                'options' => null,
                'correct_answer' => 'True',
                'explanation' => 'This statement comes directly from the course document.',
            ],
            CourseAiQuizQuestion::TYPE_SHORT_ANSWER => [
                'type' => CourseAiQuizQuestion::TYPE_SHORT_ANSWER,
                'question' => "Identify a key term from the \"{$title}\" material related to: ".Str::limit($sentence, 60, '…'),
                'options' => null,
                'correct_answer' => $concept,
                'explanation' => "\"{$concept}\" is a key term extracted from the document.",
            ],
            default => $this->assembleMcq(
                'Which term best relates to: "'.Str::limit($sentence, 80, '…').'"?',
                $concept,
                $this->pickDistractors($concepts, $concept, 3),
                'Derived from the uploaded course material.'
            ),
        };
    }

    /**
     * @param  array<int, string>  $distractors
     * @return array<string, mixed>
     */
    protected function assembleMcq(string $question, string $correct, array $distractors, string $explanation): array
    {
        $options = ['A' => $correct];
        $labels = ['B', 'C', 'D'];
        foreach ($labels as $i => $label) {
            $options[$label] = $distractors[$i] ?? 'Alternative concept '.($i + 1);
        }

        // Shuffle options but track correct letter
        $entries = array_values($options);
        shuffle($entries);
        $shuffled = [];
        $correctLetter = 'A';
        foreach (['A', 'B', 'C', 'D'] as $i => $letter) {
            $shuffled[$letter] = $entries[$i];
            if ($entries[$i] === $correct) {
                $correctLetter = $letter;
            }
        }

        return [
            'type' => CourseAiQuizQuestion::TYPE_MCQ,
            'question' => $question,
            'options' => $shuffled,
            'correct_answer' => $correctLetter,
            'explanation' => $explanation,
        ];
    }

    /**
     * @param  array<int, string>  $concepts
     * @return array<int, string>
     */
    protected function pickDistractors(array $concepts, string $correct, int $count): array
    {
        $pool = array_values(array_filter($concepts, fn ($c) => mb_strtolower($c) !== mb_strtolower($correct)));
        shuffle($pool);
        $distractors = array_slice($pool, 0, $count);

        $fallbacks = ['Unrelated process', 'Opposite approach', 'General overview', 'External framework', 'Legacy method'];
        $fi = 0;
        while (count($distractors) < $count && $fi < count($fallbacks)) {
            if (! in_array($fallbacks[$fi], $distractors, true)) {
                $distractors[] = $fallbacks[$fi];
            }
            $fi++;
        }

        return array_slice($distractors, 0, $count);
    }

    protected function pickKeywordFromSentence(string $sentence, array $concepts): ?string
    {
        foreach ($concepts as $concept) {
            if (stripos($sentence, $concept) !== false) {
                return $concept;
            }
        }

        $words = preg_split('/\s+/u', $sentence, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($words as $word) {
            $clean = preg_replace('/[^\p{L}]/u', '', $word) ?? '';
            if (strlen($clean) >= 5 && ! $this->isStopWord($clean)) {
                return ucfirst(mb_strtolower($clean));
            }
        }

        return $concepts[0] ?? null;
    }

    protected function isStopWord(string $word): bool
    {
        return in_array(mb_strtolower($word), $this->stopWords, true);
    }

    /**
     * @param  array<int, string>  $types
     * @return array<int, string>
     */
    protected function buildTypeQueue(int $count, array $types): array
    {
        $queue = [];
        for ($i = 0; $i < $count; $i++) {
            $queue[] = $types[$i % count($types)];
        }

        return $queue;
    }

    /**
     * @param  array<int, array<string, mixed>>  $existing
     */
    protected function isDuplicate(string $question, array $existing): bool
    {
        $norm = mb_strtolower(preg_replace('/\s+/', ' ', trim($question)) ?? '');

        foreach ($existing as $item) {
            $other = mb_strtolower(preg_replace('/\s+/', ' ', trim($item['question'])) ?? '');
            if ($norm === $other) {
                return true;
            }
            similar_text($norm, $other, $pct);
            if ($pct >= 85) {
                return true;
            }
        }

        return false;
    }
}
