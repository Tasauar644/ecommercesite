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
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'quantity' => 'integer',
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
        return $this->hasMany(ProductImage::class)->orderBy('position');
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
}
