<?php

use App\Http\Controllers\Admin\BannerController as AdminBannerController;
use App\Http\Controllers\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Admin\DistrictController as AdminDistrictController;
use App\Http\Controllers\Admin\PaymentSettingController as AdminPaymentSettingController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BannerController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentSettingController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/staff-login', [AuthController::class, 'staffLogin']);

Route::get('/banners', [BannerController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/districts', [AdminDistrictController::class, 'index']);
Route::get('/payment-settings', [PaymentSettingController::class, 'index']);
Route::post('/guest-orders', [OrderController::class, 'guestStore']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::patch('/profile', [AuthController::class, 'updateProfile']);

    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'myOrders']);

    Route::middleware('role:employee')->prefix('seller')->group(function () {
        Route::get('/products', [ProductController::class, 'mine']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::post('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        Route::get('/orders', [OrderController::class, 'sellerOrders']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });

    // Accessible to admin + superadmin (always) and employees who've been granted the matching permission.
    Route::middleware('role:admin,superadmin,employee')->prefix('admin')->group(function () {
        Route::middleware('permission:manage_orders')->group(function () {
            Route::get('/orders', [OrderController::class, 'adminOrders']);
            Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
        });

        Route::middleware('permission:manage_categories')->group(function () {
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        });

        Route::middleware('permission:manage_products')->group(function () {
            Route::get('/products', [AdminProductController::class, 'index']);
            Route::post('/products', [AdminProductController::class, 'store']);
            Route::post('/products/{product}', [AdminProductController::class, 'update']);
            Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

            Route::get('/banners', [AdminBannerController::class, 'index']);
            Route::post('/banners', [AdminBannerController::class, 'store']);
            Route::post('/banners/{banner}', [AdminBannerController::class, 'update']);
            Route::delete('/banners/{banner}', [AdminBannerController::class, 'destroy']);
        });

        Route::middleware('permission:manage_customers')->group(function () {
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::get('/customers/{customer}', [AdminCustomerController::class, 'show']);
        });

        Route::middleware('permission:manage_delivery')->group(function () {
            Route::get('/delivery-zones', [AdminDistrictController::class, 'zones']);
            Route::patch('/delivery-zones/{zone}', [AdminDistrictController::class, 'updateZone']);
        });
    });

    // Users tab: admin + superadmin only — never permission-gated, so an employee can never reach it no matter what's granted.
    Route::middleware('role:admin,superadmin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
        // Also reachable via POST for multipart avatar uploads — PHP never populates
        // $_FILES for true PATCH/PUT requests, only POST.
        Route::post('/users/{user}', [AdminUserController::class, 'update']);
    });

    // Superadmin only: manage other admin/employee accounts and their permissions.
    Route::middleware('role:superadmin')->prefix('admin')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::patch('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);

        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);

        // Payment routing info (e.g. the bKash number customers pay into) is superadmin-only to
        // change — anyone else able to edit it could quietly redirect customer payments elsewhere.
        Route::get('/payment-settings', [AdminPaymentSettingController::class, 'index']);
        Route::post('/payment-settings', [AdminPaymentSettingController::class, 'update']);
    });
});
