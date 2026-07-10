<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmartSearchController extends Controller
{
    public function search(Request $request)
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'max:200'],
        ]);

        $filters = $this->extractFilters($data['query']);

        $query = Product::query()
            ->with(['category:id,name', 'productImages', 'variants.productImages'])
            ->where('quantity', '>', 0);

        if (! empty($filters['keyword'])) {
            $query->where('name', 'like', '%'.$filters['keyword'].'%');
        }

        if (! empty($filters['category'])) {
            $query->whereHas('category', fn ($c) => $c->where('name', 'like', '%'.$filters['category'].'%'));
        }

        if (! empty($filters['min_price'])) {
            $query->where('price', '>=', $filters['min_price']);
        }

        if (! empty($filters['max_price'])) {
            $query->where('price', '<=', $filters['max_price']);
        }

        return response()->json([
            'products' => $query->latest()->limit(24)->get(),
            'interpreted' => $filters,
            'ai_used' => $filters['ai_used'],
        ]);
    }

    // Asks Gemini to turn a free-text query into structured filters (keyword,
    // category, price range). Falls back to a bare keyword match — using the
    // user's own text as-is — if the AI call fails or isn't configured, so
    // search never breaks just because the free-tier quota is exhausted.
    private function extractFilters(string $userQuery): array
    {
        $fallback = ['keyword' => $userQuery, 'category' => null, 'min_price' => null, 'max_price' => null, 'ai_used' => false];

        if (! config('services.gemini.key')) {
            return $fallback;
        }

        $categories = Category::orderBy('name')->pluck('name')->implode(', ');
        $model = config('services.gemini.model');

        $payload = [
            'contents' => [[
                'role' => 'user',
                'parts' => [['text' => $userQuery]],
            ]],
            'system_instruction' => ['parts' => [['text' =>
                "Extract search filters from a shopper's query for a home & decor store in Bangladesh (prices in BDT). ".
                "Available categories: {$categories}. Always call extract_filters. Leave a field null if the query doesn't imply it.",
            ]]],
            'tools' => [[
                'function_declarations' => [[
                    'name' => 'extract_filters',
                    'description' => "Structured search filters extracted from the shopper's query.",
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'keyword' => ['type' => 'string', 'description' => 'Core product keyword, e.g. "bowl"'],
                            'category' => ['type' => 'string', 'description' => 'Exact category name from the list, if implied'],
                            'min_price' => ['type' => 'number', 'description' => 'Minimum price in BDT, if implied'],
                            'max_price' => ['type' => 'number', 'description' => 'Maximum price in BDT, if implied'],
                        ],
                    ],
                ]],
            ]],
            'tool_config' => [
                'function_calling_config' => [
                    'mode' => 'ANY',
                    'allowed_function_names' => ['extract_filters'],
                ],
            ],
        ];

        // 503 ("model overloaded") is transient — worth a couple of retries.
        // 429 ("quota exceeded") is a hard daily/per-minute cap — retrying it
        // just burns more of the same exhausted quota, so fail straight to
        // the keyword fallback instead.
        $maxAttempts = 3;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
                    ->timeout(10)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", $payload);

                if ($response->status() === 429) {
                    return $fallback;
                }

                if ($response->status() === 503 && $attempt < $maxAttempts) {
                    usleep(400_000 * $attempt);

                    continue;
                }

                $json = $response->throw()->json();
                $args = $json['candidates'][0]['content']['parts'][0]['functionCall']['args'] ?? null;

                if (! $args) {
                    return $fallback;
                }

                return [
                    'keyword' => $args['keyword'] ?? null,
                    'category' => $args['category'] ?? null,
                    'min_price' => $args['min_price'] ?? null,
                    'max_price' => $args['max_price'] ?? null,
                    'ai_used' => true,
                ];
            } catch (\Throwable $e) {
                if ($attempt >= $maxAttempts) {
                    Log::warning('Smart search AI extraction failed: '.$e->getMessage());

                    return $fallback;
                }

                usleep(400_000 * $attempt);
            }
        }

        return $fallback;
    }
}
