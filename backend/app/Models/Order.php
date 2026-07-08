<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'customer_id',
        'district_id',
        'status',
        'payment_method',
        'payment_transaction_id',
        'shipping_name',
        'shipping_address',
        'shipping_phone',
        'total',
        'delivery_charge',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'delivery_charge' => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
