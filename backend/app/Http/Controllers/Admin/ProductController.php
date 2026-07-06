<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ManagesProductImages;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    use ManagesProductImages;

    public function index(Request $request)
    {
        $query = Product::query()->with(['seller:id,name', 'category:id,name', 'productImages']);

        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->latest()->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'quantity' => ['required', 'integer', 'min:0'],
            'category_id' => ['required', 'exists:categories,id'],
            'seller_id' => ['nullable', 'exists:users,id'],
            ...$this->imageValidationRules(),
        ]);

        unset($data['images'], $data['remove_image_ids']);
        $data['seller_id'] ??= $request->user()->id;

        $product = Product::create($data);
        $this->syncProductImages($product, $request);

        return response()->json($product->fresh(), 201);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'quantity' => ['sometimes', 'required', 'integer', 'min:0'],
            'category_id' => ['sometimes', 'required', 'exists:categories,id'],
            'seller_id' => ['sometimes', 'required', 'exists:users,id'],
            ...$this->imageValidationRules(),
        ]);

        unset($data['images'], $data['remove_image_ids']);

        $product->update($data);
        $this->syncProductImages($product, $request);

        return response()->json($product->fresh());
    }

    public function destroy(Product $product)
    {
        $product->productImages()->get()->each(fn ($image) => Storage::disk('public')->delete($image->path));
        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }
}
