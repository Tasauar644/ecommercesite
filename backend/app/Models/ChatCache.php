<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatCache extends Model
{
    protected $table = 'chat_cache';

    protected $fillable = ['question_hash', 'question', 'reply', 'products', 'hit_count'];

    protected $casts = [
        'products' => 'array',
    ];
}
