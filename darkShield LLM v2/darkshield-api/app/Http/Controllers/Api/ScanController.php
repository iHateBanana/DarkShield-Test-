<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scan;
use App\Services\DarkPatternClassifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScanController extends Controller
{
    /**
     * POST /api/scan
     * Accept page text, classify with LLM, store result.
     */
    public function store(Request $request, DarkPatternClassifier $classifier): JsonResponse
    {
        $validated = $request->validate([
            'url'           => 'required|string|max:2048',
            'text'          => 'required|string|max:10000',
            'regex_results' => 'nullable|array',
            'regex_score'   => 'nullable|numeric|between:0,1',
        ]);

        $text = substr($validated['text'], 0, 3000);

        $llmResult = $classifier->classify($text, $validated['url']);

        $scan = Scan::create([
            'url'               => $validated['url'],
            'extracted_text'    => $text,
            'text_length'       => strlen($text),
            'regex_results'     => $validated['regex_results'] ?? null,
            'regex_score'       => $validated['regex_score'] ?? null,
            'llm_classification'=> $llmResult,
            'is_dark_pattern'   => $llmResult['is_dark_pattern'] ?? null,
            'llm_model_used'    => 'google/gemini-2.0-flash-lite-001',
        ]);

        return response()->json([
            'scan_id'           => $scan->id,
            'is_dark_pattern'   => $scan->is_dark_pattern,
            'pattern_detected'  => $llmResult['pattern_detected'] ?? 'Unknown',
            'confidence'        => $llmResult['confidence'] ?? 0,
            'explanation'       => $llmResult['explanation'] ?? '',
            'regex_score'       => $scan->regex_score,
            'stored'            => true,
        ]);
    }

    /**
     * GET /api/scans
     * Return the 20 most recent scans.
     */
    public function index(): JsonResponse
    {
        $scans = Scan::latest()
            ->take(20)
            ->get(['id', 'url', 'is_dark_pattern', 'regex_score', 'created_at']);

        return response()->json($scans);
    }

    /**
     * GET /api/scans/stats
     * Summary statistics across all scans.
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total_scans'       => Scan::count(),
            'dark_pattern_count'=> Scan::where('is_dark_pattern', true)->count(),
            'clean_count'       => Scan::where('is_dark_pattern', false)->count(),
            'avg_regex_score'   => round(Scan::avg('regex_score') ?? 0, 2),
            'recent_scans'      => Scan::latest()->take(5)->get(['url', 'is_dark_pattern', 'created_at']),
        ]);
    }
}
