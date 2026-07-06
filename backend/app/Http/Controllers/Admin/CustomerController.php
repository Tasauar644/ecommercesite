<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::select('id', 'name', 'username', 'phone', 'email', 'created_at')
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->withMax('orders', 'created_at');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return $query->latest()->paginate(20);
    }

    public function show(Customer $customer)
    {
        $customer->loadCount('orders');
        $customer->loadSum('orders', 'total');
        $customer->loadMax('orders', 'created_at');
        $customer->load('orders.items.product');

        return $customer;
    }
}
