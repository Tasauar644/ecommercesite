<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Super Admin',
            'username' => 'superadmin',
            'phone' => '555-0100',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);

        $seller = User::create([
            'name' => 'Demo Seller',
            'username' => 'demo_seller',
            'phone' => '555-0102',
            'email' => 'seller@example.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
        ]);

        Customer::create([
            'name' => 'Demo Customer',
            'username' => 'demo_customer',
            'phone' => '555-0103',
            'email' => 'customer@example.com',
            'password' => Hash::make('password'),
        ]);

        $electronics = Category::create(['name' => 'Electronics']);
        $accessories = Category::create(['name' => 'Accessories']);
        Category::create(['name' => 'Home & Living']);

        $products = [
            ['name' => 'Wireless Headphones', 'description' => 'Over-ear headphones with active noise cancellation and 30-hour battery life.', 'price' => 79.99, 'quantity' => 25, 'category_id' => $electronics->id],
            ['name' => 'Smart Watch', 'description' => 'Fitness tracking smart watch with heart-rate monitor and GPS.', 'price' => 129.99, 'quantity' => 15, 'category_id' => $electronics->id],
            ['name' => 'Mechanical Keyboard', 'description' => 'Compact mechanical keyboard with hot-swappable switches and RGB backlight.', 'price' => 59.99, 'quantity' => 40, 'category_id' => $electronics->id],
            ['name' => 'Portable Speaker', 'description' => 'Waterproof Bluetooth speaker with deep bass and 12-hour playtime.', 'price' => 39.99, 'quantity' => 30, 'category_id' => $electronics->id],
            ['name' => 'Ergonomic Mouse', 'description' => 'Wireless ergonomic mouse designed for all-day comfort.', 'price' => 24.99, 'quantity' => 50, 'category_id' => $accessories->id],
            ['name' => 'USB-C Hub', 'description' => '7-in-1 USB-C hub with HDMI, SD card reader, and fast charging.', 'price' => 34.99, 'quantity' => 20, 'category_id' => $accessories->id],
        ];

        foreach ($products as $product) {
            Product::create($product + ['seller_id' => $seller->id]);
        }
    }
}
