<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'admin', 'seller', 'employee', 'customer') NOT NULL DEFAULT 'customer'");
        DB::table('users')->where('role', 'seller')->update(['role' => 'employee']);
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'admin', 'employee', 'customer') NOT NULL DEFAULT 'customer'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'admin', 'seller', 'employee', 'customer') NOT NULL DEFAULT 'customer'");
        DB::table('users')->where('role', 'employee')->update(['role' => 'seller']);
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'admin', 'seller', 'customer') NOT NULL DEFAULT 'customer'");
    }
};
