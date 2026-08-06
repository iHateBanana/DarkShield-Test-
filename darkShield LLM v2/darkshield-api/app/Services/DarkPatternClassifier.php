<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class DarkPatternClassifier
{
    private string $apiKey;
    private string $baseUrl = 'https://openrouter.ai/api/v1';
    private string $model = 'google/gemini-2.0-flash-lite-001';

    public function __construct()
    {
        $this->apiKey = config('services.openrouter.key');
    }

    /**
     * Classify page text for dark patterns.
     * Returns the parsed LLM response as an array.
     */
    public function classify(string $text, string $url = ''): array
    {
        $prompt = <<<PROMPT
Analyse this web page text and detect dark patterns. Look for these three types:

1. False Urgency — fake scarcity or time pressure ("Only 2 left!", "Sale ends in 5 minutes")
2. Confirmshaming — guilt-tripping users into not opting out ("No thanks, I don't want to save money")
3. Preselection — pre-checked boxes for paid add-ons or subscriptions

Return ONLY valid JSON in this exact format, no markdown, no preamble:
{
  "is_dark_pattern": true or false,
  "pattern_detected": "False Urgency" or "Confirmshaming" or "Preselection" or "None",
  "confidence": 0.0 to 1.0,
  "explanation": "One sentence, max 100 chars"
}

Page text:
{$text}
PROMPT;

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->post($this->baseUrl . '/chat/completions', [
            'model'      => $this->model,
            'messages'   => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'temperature' => 0.1,
            'max_tokens'  => 200,
        ]);

        if (!$response->successful()) {
            return [
                'error'  => true,
                'status' => $response->status(),
                'body'   => $response->body(),
            ];
        }

        $content = $response->json('choices.0.message.content');
        $clean   = preg_replace('/```json\n?|```/', '', $content ?? '');

        return json_decode(trim($clean), true)
            ?? ['error' => 'JSON parse failed', 'raw' => $content];
    }
}
