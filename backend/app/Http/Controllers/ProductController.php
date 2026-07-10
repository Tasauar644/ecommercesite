<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ManagesProductImages;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    use ManagesProductImages;

    public function index(Request $request)
    {
        $query = Product::query()
            ->with(['seller:id,name', 'category:id,name', 'productImages', 'variants.productImages'])
            ->where('quantity', '>', 0);

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($categoryId = $request->query('category_id')) {
            $ids = array_filter(array_map('intval', explode(',', $categoryId)));
            if ($ids) {
                $query->whereIn('category_id', $ids);
            }
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        $products = $query->latest()->paginate(12);

        if (Setting::get('auto_best_seller_enabled', '0') === '1') {
            $autoIds = Product::autoBestSellerIds();
            $products->getCollection()->each(function (Product $p) use ($autoIds) {
                if (in_array($p->id, $autoIds)) {
                    $p->is_best_seller = true;
                }
            });
        }

        return $products;
    }

    public function show(Product $product)
    {
        $product->load('seller:id,name', 'category:id,name', 'productImages', 'variants.productImages');

        if (! $product->is_best_seller && Setting::get('auto_best_seller_enabled', '0') === '1') {
            $product->is_best_seller = in_array($product->id, Product::autoBestSellerIds());
        }

        return $product;
    }

    // AI-picked "you may also like" — complementary items, not just same
    // category. Cached 24h per product: this fires on every product-page
    // view, and the free Gemini tier is capped at 20 requests/day total, so
    // an uncached call here would burn the whole daily budget almost
    // immediately. Falls back to a plain category match if AI is
    // unavailable/unconfigured/quota-exhausted — same result as before this
    // feature existed, never a broken page.
    public function recommendations(Product $product)
    {
        $ids = Cache::remember("product_recommendations_{$product->id}", now()->addHours(24), fn () => $this->fetchAiRecommendationIds($product));

        $products = Product::whereIn('id', $ids)
            ->where('quantity', '>', 0)
            ->with(['category:id,name', 'productImages', 'variants.productImages'])
            ->get()
            ->sortBy(fn (Product $p) => array_search($p->id, $ids))
            ->values();

        if ($products->count() < 4) {
            $fallbackIds = $this->fallbackProductIds($product, $products->pluck('id')->all(), 4 - $products->count());
            $fallback = Product::whereIn('id', $fallbackIds)
                ->with(['category:id,name', 'productImages', 'variants.productImages'])
                ->get();
            $products = $products->concat($fallback);
        }

        return response()->json($products->values());
    }

    private function fetchAiRecommendationIds(Product $product): array
    {
        if (! config('services.gemini.key')) {
            return $this->fallbackProductIds($product);
        }

        try {
            $candidates = Product::where('id', '!=', $product->id)
                ->where('quantity', '>', 0)
                ->with('category:id,name')
                ->inRandomOrder()
                ->limit(40)
                ->get(['id', 'name', 'category_id']);

            if ($candidates->isEmpty()) {
                return [];
            }

            $catalogText = $candidates
                ->map(fn (Product $p) => "{$p->id}: {$p->name} (category: ".($p->category->name ?? 'none').')')
                ->implode("\n");

            $model = config('services.gemini.model');
            $categoryName = $product->category->name ?? 'none';
            $description = Str::limit((string) $product->description, 200);

            $prompt = "Customer is viewing: \"{$product->name}\" (category: {$categoryName}, description: {$description}).\n\n"
                ."Catalog:\n{$catalogText}\n\n"
                .'Pick up to 4 product IDs from the catalog above that this customer would also likely want — '
                .'complementary items, same use-case, or similar style. Prefer variety over near-duplicates. Always call pick_related_products.';

            $response = Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
                ->timeout(10)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                    'contents' => [
                        ['role' => 'user', 'parts' => [['text' => $prompt]]],
                    ],
                    'tools' => [[
                        'function_declarations' => [[
                            'name' => 'pick_related_products',
                            'description' => 'Product IDs recommended alongside the viewed product.',
                            'parameters' => [
                                'type' => 'object',
                                'properties' => [
                                    'product_ids' => [
                                        'type' => 'array',
                                        'items' => ['type' => 'integer'],
                                        'description' => 'Up to 4 product IDs chosen from the given catalog',
                                    ],
                                ],
                                'required' => ['product_ids'],
                            ],
                        ]],
                    ]],
                    'tool_config' => [
                        'function_calling_config' => [
                            'mode' => 'ANY',
                            'allowed_function_names' => ['pick_related_products'],
                        ],
                    ],
                ]);

            if (in_array($response->status(), [429, 503], true)) {
                return $this->fallbackProductIds($product);
            }

            $json = $response->throw()->json();
            $ids = $json['candidates'][0]['content']['parts'][0]['functionCall']['args']['product_ids'] ?? [];
            $ids = array_values(array_intersect($ids, $candidates->pluck('id')->all()));

            return array_slice($ids, 0, 4) ?: $this->fallbackProductIds($product);
        } catch (\Throwable $e) {
            Log::warning('Product recommendations AI failed: '.$e->getMessage());

            return $this->fallbackProductIds($product);
        }
    }

    // Same-category products first; if the category doesn't have enough on
    // its own, top up with any other in-stock product so the row is never
    // short — this is the exact behaviour product-detail.ts used before AI
    // recommendations existed, kept as the guaranteed fallback.
    private function fallbackProductIds(Product $product, array $excludeIds = [], int $limit = 4): array
    {
        $excludeIds = array_unique(array_merge($excludeIds, [$product->id]));

        $sameCategory = Product::whereNotIn('id', $excludeIds)
            ->where('quantity', '>', 0)
            ->when($product->category_id, fn ($q) => $q->where('category_id', $product->category_id))
            ->latest()
            ->limit($limit)
            ->pluck('id')
            ->all();

        if (count($sameCategory) >= $limit) {
            return $sameCategory;
        }

        $anyOther = Product::whereNotIn('id', array_merge($excludeIds, $sameCategory))
            ->where('quantity', '>', 0)
            ->latest()
            ->limit($limit - count($sameCategory))
            ->pluck('id')
            ->all();

        return array_merge($sameCategory, $anyOther);
    }

    public function mine(Request $request)
    {
        return $request->user()->products()->with('productImages')->latest()->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'quantity' => ['required', 'integer', 'min:0'],
            'category_id' => ['required', 'exists:categories,id'],
            ...$this->imageValidationRules(),
        ]);

        unset($data['images'], $data['remove_image_ids']);

        $product = $request->user()->products()->create($data);
        $this->syncProductImages($product, $request);

        return response()->json($product->fresh(), 201);
    }

    public function update(Request $request, Product $product)
    {
        $this->authorizeOwner($request, $product);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'quantity' => ['sometimes', 'required', 'integer', 'min:0'],
            'category_id' => ['sometimes', 'required', 'exists:categories,id'],
            ...$this->imageValidationRules(),
        ]);

        unset($data['images'], $data['remove_image_ids']);

        $product->update($data);
        $this->syncProductImages($product, $request);

        return response()->json($product->fresh());
    }

    public function destroy(Request $request, Product $product)
    {
        $this->authorizeOwner($request, $product);

        $product->productImages()->get()->each(fn ($image) => Storage::disk('public')->delete($image->path));
        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }

    private function authorizeOwner(Request $request, Product $product): void
    {
        abort_if($product->seller_id !== $request->user()->id, 403, 'Forbidden');
    }
}
