<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

trait ManagesProductImages
{
    private function imageValidationRules(): array
    {
        return [
            'images' => ['sometimes', 'array', 'max:3'],
            'images.*' => ['image', 'max:4096'],
            'remove_image_ids' => ['sometimes', 'array'],
            'remove_image_ids.*' => ['integer'],
        ];
    }

    /**
     * Applies new uploads / removals to a product's images, enforcing 1-3 images total.
     */
    private function syncProductImages(Product $product, Request $request): void
    {
        $removeIds = $request->input('remove_image_ids', []);
        $newFiles = $request->file('images', []);

        $existingCount = $product->productImages()->count();
        $finalCount = $existingCount - count($removeIds) + count($newFiles);

        if ($finalCount < 1) {
            throw ValidationException::withMessages(['images' => ['A product needs at least one image.']]);
        }

        if ($finalCount > 3) {
            throw ValidationException::withMessages(['images' => ['A product can have at most 3 images.']]);
        }

        if (! empty($removeIds)) {
            $product->productImages()->whereIn('id', $removeIds)->get()->each(function ($image) {
                Storage::disk('public')->delete($image->path);
                $image->delete();
            });
        }

        $position = $product->productImages()->count();

        foreach ($newFiles as $file) {
            $product->productImages()->create([
                'path' => $file->store('products', 'public'),
                'position' => $position++,
            ]);
        }
    }
}
