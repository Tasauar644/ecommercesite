<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'color_name',
        'color_hex',
        'price',
        'quantity',
    ];

    protected $appends = ['images'];

    protected $hidden = ['productImages'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'quantity' => 'integer',
        ];
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

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function productImages()
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }
}
