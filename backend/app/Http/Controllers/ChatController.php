<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\ChatCache;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    private const MAX_TOOL_TURNS = 4;
    private const MAX_PRODUCTS_PER_SEARCH = 6;
    private const HISTORY_TURNS_SENT = 10;
    private const CACHE_TTL_HOURS = 6;

    public function send(Request $request)
    {
        abort_unless(config('services.gemini.key'), 503, 'The chat assistant is not configured yet.');

        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:30'],
            'messages.*.role' => ['required', Rule::in(['user', 'assistant'])],
            'messages.*.content' => ['required', 'string', 'max:2000'],
        ]);

        // Only a standalone first question is safe to cache — an answer to a
        // follow-up depends on the conversation so far and could mislead if reused.
        $cacheHash = count($data['messages']) === 1
            ? hash('sha256', $this->normalizeQuestion($data['messages'][0]['content']))
            : null;

        if ($cacheHash) {
            $cached = ChatCache::where('question_hash', $cacheHash)
                ->where('updated_at', '>=', now()->subHours(self::CACHE_TTL_HOURS))
                ->first();

            if ($cached) {
                $cached->increment('hit_count');

                return response()->json([
                    'reply' => $cached->reply,
                    'products' => $cached->products,
                ]);
            }
        }

        // Only send recent turns to Gemini — keeps token usage (and free-tier
        // per-minute token quota) bounded on long conversations.
        $recentMessages = array_slice($data['messages'], -self::HISTORY_TURNS_SENT);

        $contents = collect($recentMessages)->map(fn ($m) => [
            'role' => $m['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $m['content']]],
        ])->values()->all();

        $productsShown = new Collection();

        try {
            for ($turn = 0; $turn < self::MAX_TOOL_TURNS; $turn++) {
                $candidate = $this->callGemini($contents);
                $parts = $candidate['content']['parts'] ?? [];

                $functionCalls = collect($parts)->filter(fn ($p) => isset($p['functionCall']));

                if ($functionCalls->isEmpty()) {
                    $text = collect($parts)->pluck('text')->filter()->implode('');
                    $products = $productsShown->unique('id')->values();

                    if ($cacheHash && $text !== '') {
                        ChatCache::updateOrCreate(
                            ['question_hash' => $cacheHash],
                            [
                                'question' => $this->normalizeQuestion($data['messages'][0]['content']),
                                'reply' => $text,
                                'products' => $products->all(),
                                'hit_count' => 1,
                            ]
                        );
                    }

                    return response()->json([
                        'reply' => $text !== '' ? $text : "Sorry, I couldn't put together a reply — could you try rephrasing?",
                        'products' => $products,
                    ]);
                }

                // Echo the model's own function-call turn back, then answer each call it made.
                $contents[] = ['role' => 'model', 'parts' => $parts];

                $responseParts = [];
                foreach ($functionCalls as $call) {
                    $name = $call['functionCall']['name'] ?? '';
                    $args = $call['functionCall']['args'] ?? [];

                    $result = match ($name) {
                        'search_products' => $this->searchProducts($args, $productsShown),
                        default => ['error' => "Unknown tool: {$name}"],
                    };

                    $responseParts[] = [
                        'functionResponse' => [
                            'name' => $name,
                            'response' => $result,
                        ],
                    ];
                }

                $contents[] = ['role' => 'function', 'parts' => $responseParts];
            }
        } catch (\Throwable $e) {
            Log::warning('Chat assistant request failed: '.$e->getMessage());

            return response()->json([
                'reply' => "I'm having trouble connecting right now — please try again in a moment.",
                'products' => [],
            ], 502);
        }

        return response()->json([
            'reply' => "I'm having trouble finding an answer right now — please try again in a moment.",
            'products' => $productsShown->unique('id')->values(),
        ]);
    }

    private function normalizeQuestion(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', mb_strtolower($text)));
    }

    private function callGemini(array $contents): array
    {
        $model = config('services.gemini.model');

        $response = Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
            ->timeout(20)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'contents' => $contents,
                'system_instruction' => $this->systemInstruction(),
                'tools' => $this->tools(),
            ])
            ->throw()
            ->json();

        return $response['candidates'][0] ?? ['content' => ['parts' => [['text' => '']]]];
    }

    private function systemInstruction(): array
    {
        $categories = Category::orderBy('name')->pluck('name')->implode(', ');

        return ['parts' => [['text' => <<<TEXT
        You are the friendly shopping assistant for Dream N Decor, a home & decor e-commerce store based in Bangladesh.

        Available categories: {$categories}

        Rules:
        - Always call the search_products tool before recommending, naming, or pricing any product. Never invent a product, price, or stock level.
        - Prices are in BDT (Bangladeshi Taka).
        - Delivery is available nationwide; the exact charge depends on the customer's district and is shown at checkout.
        - Payment: Cash on Delivery is available only within Dhaka. Outside Dhaka, customers must pay the full amount upfront via bKash (manual send-money, confirmed with a transaction ID at checkout).
        - Customers can check out as a guest — no account is required.
        - Keep replies short, warm, and easy to skim. Don't repeat the same product list twice in one reply.
        - Reply in whichever language the customer writes in — Bangla (বাংলা) or English. If they mix both, mixing is fine too. Never switch languages on them unprompted.
        TEXT]]];
    }

    private function tools(): array
    {
        return [[
            'function_declarations' => [[
                'name' => 'search_products',
                'description' => "Search the store's real, current product catalog. Always call this before mentioning any specific product, price, or availability — never answer from memory.",
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Keyword to match against product names, e.g. "bed sheet"'],
                        'category' => ['type' => 'string', 'description' => 'Exact category name to filter by'],
                        'max_price' => ['type' => 'number', 'description' => 'Maximum price in BDT'],
                    ],
                ],
            ]],
        ]];
    }

    private function searchProducts(array $args, Collection $productsShown): array
    {
        $query = Product::query()->with('category:id,name')->where('quantity', '>', 0);

        if (! empty($args['query'])) {
            $query->where('name', 'like', '%'.$args['query'].'%');
        }
        if (! empty($args['category'])) {
            $query->whereHas('category', fn ($c) => $c->where('name', 'like', '%'.$args['category'].'%'));
        }
        if (! empty($args['max_price'])) {
            $query->where('price', '<=', $args['max_price']);
        }

        $products = $query->latest()->limit(self::MAX_PRODUCTS_PER_SEARCH)->get();

        $products->each(fn (Product $p) => $productsShown->push([
            'id' => $p->id,
            'name' => $p->name,
            'price' => $p->price,
            'image_url' => $p->image_url,
        ]));

        return [
            'count' => $products->count(),
            'products' => $products->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => $p->price,
                'quantity' => $p->quantity,
                'category' => $p->category?->name,
            ])->all(),
        ];
    }
}
