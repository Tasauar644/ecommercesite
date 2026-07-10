<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ManagesProductImages;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    use ManagesProductImages;

    public function index(Request $request)
    {
        $query = Product::query()->with(['seller:id,name', 'category:id,name', 'productImages', 'variants.productImages']);

        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $autoEnabled = Setting::get('auto_best_seller_enabled', '0') === '1';
        $autoIds = $autoEnabled ? Product::autoBestSellerIds() : [];

        if ($request->boolean('best_seller_only')) {
            $query->where(function ($q) use ($autoIds) {
                $q->where('is_best_seller', true);
                if (! empty($autoIds)) {
                    $q->orWhereIn('id', $autoIds);
                }
            });
        }

        $products = $query->latest()->paginate(20);

        $this->markAutoBestSellers($products->getCollection(), $autoIds);

        return $products;
    }

    public function store(Request $request)
    {
        $hasVariants = count($request->input('variants', [])) > 0;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => [$hasVariants ? 'nullable' : 'required', 'numeric', 'min:0'],
            'quantity' => [$hasVariants ? 'nullable' : 'required', 'integer', 'min:0'],
            'category_id' => ['required', 'exists:categories,id'],
            'seller_id' => ['nullable', 'exists:users,id'],
            'is_best_seller' => ['sometimes', 'boolean'],
            ...$this->imageValidationRules(),
            ...$this->variantValidationRules(),
        ]);

        unset($data['images'], $data['remove_image_ids'], $data['variants']);
        $data['seller_id'] ??= $request->user()->id;
        $data['price'] ??= 0;
        $data['quantity'] ??= 0;

        $product = DB::transaction(function () use ($data, $hasVariants, $request) {
            $product = Product::create($data);

            if ($hasVariants) {
                $this->syncVariants($product, $request);
            } else {
                $this->syncProductImages($product, $request);
            }

            return $product;
        });

        return response()->json($product->fresh()->load('variants.productImages'), 201);
    }

    public function update(Request $request, Product $product)
    {
        // Only a request that explicitly sends 'variants' is allowed to touch variants
        // at all — otherwise an unrelated partial update (e.g. editing just the name)
        // would see an empty variants array and delete every existing variant.
        $touchesVariants = $request->has('variants');
        $hasVariants = $touchesVariants ? count($request->input('variants', [])) > 0 : $product->variants()->exists();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'quantity' => ['sometimes', 'required', 'integer', 'min:0'],
            'category_id' => ['sometimes', 'required', 'exists:categories,id'],
            'seller_id' => ['sometimes', 'required', 'exists:users,id'],
            'is_best_seller' => ['sometimes', 'boolean'],
            ...$this->imageValidationRules(),
            ...$this->variantValidationRules(),
        ]);

        unset($data['images'], $data['remove_image_ids'], $data['variants']);

        DB::transaction(function () use ($product, $data, $touchesVariants, $hasVariants, $request) {
            $product->update($data);

            if ($touchesVariants) {
                $this->syncVariants($product, $request);
            } elseif (! $hasVariants) {
                $this->syncProductImages($product, $request);
            }
        });

        return response()->json($product->fresh()->load('variants.productImages'));
    }

    public function destroy(Product $product)
    {
        $product->productImages()->get()->each(fn ($image) => Storage::disk('public')->delete($image->path));

        $product->variants()->with('productImages')->get()->each(function (ProductVariant $variant) {
            $variant->productImages->each(fn ($image) => Storage::disk('public')->delete($image->path));
        });

        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }

    /**
     * When auto-detect is on, flags today's top-selling product(s) as best
     * sellers alongside any manually-flagged ones. In-memory only — this
     * never overwrites the stored is_best_seller column.
     */
    private function markAutoBestSellers(Collection $products, array $autoIds): void
    {
        if (empty($autoIds)) {
            return;
        }

        $products->each(function (Product $p) use ($autoIds) {
            if (in_array($p->id, $autoIds)) {
                $p->is_best_seller = true;
            }
        });
    }

    private function variantValidationRules(): array
    {
        return [
            'variants' => ['sometimes', 'array', 'max:3'],
            'variants.*.id' => ['sometimes', 'integer'],
            'variants.*.color_name' => ['required_with:variants', 'string', 'max:100'],
            'variants.*.color_hex' => ['nullable', 'string', 'max:20'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0'],
            'variants.*.quantity' => ['required_with:variants', 'integer', 'min:0'],
            'variants.*.images' => ['sometimes', 'array', 'max:3'],
            'variants.*.images.*' => ['image', 'max:4096'],
            'variants.*.remove_image_ids' => ['sometimes', 'array'],
            'variants.*.remove_image_ids.*' => ['integer'],
        ];
    }

    /**
     * Replaces a product's full set of color variants with whatever was submitted:
     * updates variants that carry an existing id, creates the rest, and deletes any
     * variant that's no longer present. The product's own price/quantity are then
     * denormalized from the variants so every other screen that reads them directly
     * (product cards, admin table, cart stock checks) keeps working unchanged.
     */
    private function syncVariants(Product $product, Request $request): void
    {
        $variantsInput = $request->input('variants', []);
        $variantFiles = $request->file('variants', []);

        $incomingIds = collect($variantsInput)->pluck('id')->filter()->map(fn ($id) => (int) $id);

        $product->variants()->whereNotIn('id', $incomingIds)->with('productImages')->get()->each(function (ProductVariant $variant) {
            $variant->productImages->each(fn ($image) => Storage::disk('public')->delete($image->path));
            $variant->delete();
        });

        foreach ($variantsInput as $index => $variantData) {
            $variant = isset($variantData['id']) ? $product->variants()->find($variantData['id']) : null;

            $attributes = [
                'color_name' => $variantData['color_name'],
                'color_hex' => $variantData['color_hex'] ?? null,
                'price' => $variantData['price'],
                'quantity' => $variantData['quantity'],
            ];

            $variant = $variant
                ? tap($variant)->update($attributes)
                : $product->variants()->create($attributes);

            $this->syncVariantImages(
                $variant,
                $variantFiles[$index]['images'] ?? [],
                $variantData['remove_image_ids'] ?? []
            );
        }

        if ($product->variants()->exists()) {
            $product->update([
                'price' => $product->variants()->min('price'),
                'quantity' => $product->variants()->sum('quantity'),
            ]);
        }
    }

    private function syncVariantImages(ProductVariant $variant, array $newFiles, array $removeIds): void
    {
        $existingCount = $variant->productImages()->count();
        $finalCount = $existingCount - count($removeIds) + count($newFiles);

        if ($finalCount < 1) {
            throw ValidationException::withMessages(['variants' => ["Each color needs at least one photo (missing for \"{$variant->color_name}\")."]]);
        }

        if ($finalCount > 3) {
            throw ValidationException::withMessages(['variants' => ["Each color can have at most 3 photos (\"{$variant->color_name}\" has too many)."]]);
        }

        if (! empty($removeIds)) {
            $variant->productImages()->whereIn('id', $removeIds)->get()->each(function ($image) {
                Storage::disk('public')->delete($image->path);
                $image->delete();
            });
        }

        $position = $variant->productImages()->count();

        foreach ($newFiles as $file) {
            $variant->productImages()->create([
                'product_id' => $variant->product_id,
                'path' => $file->store('products', 'public'),
                'position' => $position++,
            ]);
        }
    }
}
