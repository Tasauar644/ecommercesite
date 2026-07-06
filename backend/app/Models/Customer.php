<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'phone',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['role'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function getRoleAttribute(): string
    {
        return 'customer';
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
