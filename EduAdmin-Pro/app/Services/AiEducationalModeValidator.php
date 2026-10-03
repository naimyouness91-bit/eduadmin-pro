<?php

namespace App\Services;

use App\Models\AiConversation;
use Illuminate\Support\Str;

class AiEducationalModeValidator
{
    public const REJECTION_MESSAGE = 'I am designed to help with educational topics and study support.';

    /**
     * Suggested prompt IDs and structured study actions are always treated as educational.
     *
     * @var array<int, string>
     */
    public const TRUSTED_PROMPT_TYPES = [
        'explain',
        'summary',
        'quiz',
        'study_plan',
        'exam_prep',
        'concept',
        'resources',
        'question',
        'homework',
        AiExamPrepService::PROMPT_QUIZ,
        AiExamPrepService::PROMPT_EXPLAIN,
        AiExamPrepService::PROMPT_SUMMARY,
        AiExamPrepService::PROMPT_REVISION,
        AiExamPrepService::PROMPT_WEAK,
        AiExamPrepService::PROMPT_RESOURCES,
    ];

    /**
     * @var array<int, string>
     */
    protected const BLOCKED_PATTERNS = [
        '/\b(who will win|match prediction|betting odds|sports bet|place a bet|wager on)\b/i',
        '/\b(gambl|casino|lottery|poker|blackjack|roulette|slot machine)\b/i',
        '/\b(porn|xxx|nsfw|nude|adult content|sexual content|erotic)\b/i',
        '/\b(hack into|steal password|buy drugs|buy weapon|counterfeit|pirate software)\b/i',
        '/\b(who should i vote|political party|election campaign|campaign promise)\b/i',
        '/\b(who will win).*(election|referendum|vote)\b/i',
        '/\b(celebrity gossip|dating advice|relationship advice|pickup line)\b/i',
        '/\b(recipe for|cook me|restaurant recommend|what movie|netflix show)\b/i',
        '/\b(crypto pump|get rich quick|forex signal|day trade tips)\b/i',
        '/\b(football match|soccer match|basketball game).*(win|score|predict)/i',
        '/\b(win tomorrow).*(match|game|football|soccer|basketball)/i',
    ];

    /**
     * @var array<int, string>
     */
    protected const ALLOWED_PATTERNS = [
        '/\b(math|mathematics|algebra|calculus|geometry|trigonometry|statistics|equation)\b/i',
        '/\b(program|programming|code|coding|algorithm|data structure|software)\b/i',
        '/\b(database|sql|mysql|postgres|normalization|denormalization|joins?|query|erd)\b/i',
        '/\b(laravel|php|react|javascript|typescript|html|css|web dev|middleware|api)\b/i',
        '/\b(science|physics|chemistry|biology|lab|experiment|molecule|cell)\b/i',
        '/\b(history|geography|civics|literature|language|grammar|vocabulary|essay)\b/i',
        '/\b(exam|test prep|homework|assignment|lesson|syllabus|study|revise|revision)\b/i',
        '/\b(explain|summarize|summary|quiz|question|practice|concept|difficult)\b/i',
        '/\b(learning resource|study plan|flashcard|notes|grade|course|subject|topic)\b/i',
        '/\b(prepare me|help me study|weak subject|improve in|understand)\b/i',
    ];

    public function allows(
        string $message,
        ?string $promptType = null,
        ?AiConversation $conversation = null
    ): bool {
        $text = trim($message);

        if ($text === '') {
            return false;
        }

        if ($promptType && in_array($promptType, self::TRUSTED_PROMPT_TYPES, true)) {
            return true;
        }

        if ($this->matchesBlocked($text)) {
            return false;
        }

        if ($this->matchesAllowed($text)) {
            return true;
        }

        if ($conversation && $this->isEducationalFollowUp($text, $conversation)) {
            return true;
        }

        if ($this->isBriefStudyGreeting($text)) {
            return true;
        }

        return false;
    }

    public function allowsTopic(string $topic): bool
    {
        return $this->allows($topic);
    }

    public function rejectionMessage(): string
    {
        return self::REJECTION_MESSAGE;
    }

    protected function matchesBlocked(string $text): bool
    {
        foreach (self::BLOCKED_PATTERNS as $pattern) {
            if (preg_match($pattern, $text)) {
                return true;
            }
        }

        return false;
    }

    protected function matchesAllowed(string $text): bool
    {
        foreach (self::ALLOWED_PATTERNS as $pattern) {
            if (preg_match($pattern, $text)) {
                return true;
            }
        }

        return false;
    }

    protected function isEducationalFollowUp(string $text, AiConversation $conversation): bool
    {
        if (strlen($text) > 200) {
            return false;
        }

        $hasEducationalHistory = $conversation->messages()
            ->where('role', 'user')
            ->get()
            ->contains(fn ($m) => $this->matchesAllowed($m->content) && ! $this->matchesBlocked($m->content));

        if (! $hasEducationalHistory) {
            return false;
        }

        $lower = Str::lower($text);

        return (bool) preg_match(
            '/\b(example|more detail|continue|explain more|clarify|another|elaborate|why|how|what about|give me|show me|yes|thanks|ok|okay)\b/',
            $lower
        );
    }

    protected function isBriefStudyGreeting(string $text): bool
    {
        $lower = Str::lower(trim($text));

        return strlen($lower) <= 40 && (bool) preg_match(
            '/^(hi|hello|hey|good morning|good afternoon|help|start)(\s|!|\.)*$/',
            $lower
        );
    }
}
