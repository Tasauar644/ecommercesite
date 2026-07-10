<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    protected $fillable = [
        'seller_id',
        'category_id',
        'name',
        'description',
        'price',
        'quantity',
        'image_path',
        'is_best_seller',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'quantity' => 'integer',
            'is_best_seller' => 'boolean',
        ];
    }

    protected $appends = ['image_url', 'images'];

    // The raw relation is hidden from JSON output; only the computed `images`
    // accessor (a plain {id, url} array) is exposed to the API.
    protected $hidden = ['productImages'];

    public function getImageUrlAttribute(): ?string
    {
        $first = $this->loadedOrFetchedImages()->first();

        if ($first) {
            return $first->url;
        }

        return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
    }

    public function getImagesAttribute()
    {
        return $this->loadedOrFetchedImages()
            ->map(fn (ProductImage $image) => ['id' => $image->id, 'url' => $image->url])
            ->values();
    }

    private function loadedOrFetchedImages()
    {
        return $this->relationLoaded('productImages') ? $this->getRelation('productImages') : $this->productImages()->get();
    }

    public function productImages()
    {
        // Scoped to the product's own (non-variant) images; a variant's images
        // live on the same table but are fetched through ProductVariant::productImages().
        return $this->hasMany(ProductImage::class)->whereNull('product_variant_id')->orderBy('position');
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Product ids with the most units sold today (excluding cancelled orders),
     * highest first. Used to auto-highlight a "Best Seller Today" badge when
     * that mode is enabled — separate from the manual is_best_seller flag.
     */
    public static function autoBestSellerIds(int $limit = 1): array
    {
        return OrderItem::query()
            ->selectRaw('product_id, SUM(quantity) as sold')
            ->whereNotNull('product_id')
            ->whereHas('order', fn ($q) => $q->whereDate('created_at', now()->toDateString())->where('status', '!=', 'cancelled'))
            ->groupBy('product_id')
            ->orderByDesc('sold')
            ->limit($limit)
            ->pluck('product_id')
            ->all();
    }
}
