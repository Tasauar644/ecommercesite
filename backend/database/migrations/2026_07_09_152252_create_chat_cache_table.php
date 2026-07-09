<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chat_cache', function (Blueprint $table) {
            $table->id();
            $table->string('question_hash', 64)->unique();
            $table->text('question');
            $table->text('reply');
            $table->json('products')->nullable();
            $table->unsignedInteger('hit_count')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_cache');
    }
};
