<?php

namespace App\Services\Llm;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * OpenAI-compatible chat client (OpenAI, Azure OpenAI, GitHub Models, etc.).
 */
class OpenAiCompatibleClient
{
    public function isConfigured(): bool
    {
        return (bool) config('services.openai.api_key');
    }

    public function model(): string
    {
        return (string) config('services.openai.model', 'gpt-4o-mini');
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $options
     * @return array{content: string, model: string, usage: array<string, mixed>|null}
     */
    public function chatJson(array $messages, array $options = []): array
    {
        $apiKey = config('services.openai.api_key');
        if (! $apiKey) {
            throw new \RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $payload = array_merge([
            'model' => $this->model(),
            'messages' => $messages,
            'temperature' => 0.35,
            'max_tokens' => 8000,
            'response_format' => ['type' => 'json_object'],
        ], $options);

        $response = $this->request($payload);

        if (! $response->successful()) {
            $body = $response->json();
            $detail = $body['error']['message'] ?? $response->body();
            throw new \RuntimeException('LLM request failed: '.$detail);
        }

        $content = trim((string) $response->json('choices.0.message.content', ''));
        if ($content === '') {
            throw new \RuntimeException('LLM returned an empty response.');
        }

        return [
            'content' => $content,
            'model' => (string) $response->json('model', $this->model()),
            'usage' => $response->json('usage'),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function request(array $payload): Response
    {
        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $timeout = (int) config('services.openai.timeout', 120);

        $request = Http::withToken(config('services.openai.api_key'))
            ->timeout($timeout)
            ->acceptJson();

        $organization = config('services.openai.organization');
        if ($organization) {
            $request = $request->withHeaders(['OpenAI-Organization' => $organization]);
        }

        return $request->post("{$baseUrl}/chat/completions", $payload);
    }
}
