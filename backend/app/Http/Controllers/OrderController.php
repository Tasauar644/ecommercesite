<?php

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $order = $this->createOrder($request, $request->user()->id);

        return response()->json($order->load('items.product', 'district'), 201);
    }

    public function guestStore(Request $request)
    {
        $order = $this->createOrder($request, null);

        return response()->json($order->load('items.product', 'district'), 201);
    }

    private function createOrder(Request $request, ?int $customerId): Order
    {
        $data = $request->validate([
            'shipping_name' => ['required', 'string', 'max:255'],
            'shipping_address' => [
                'required', 'string', 'min:10', 'max:255',
                'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/',
            ],
            'shipping_phone' => ['required', 'string', 'regex:/^(?:\+?880|0)1[3-9]\d{8}$/'],
            'district_id' => ['required', 'integer', 'exists:districts,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ], [
            'shipping_address.regex' => 'Enter a complete address, including a house/road number and area (e.g. House 12, Road 5, Dhanmondi, Dhaka).',
            'shipping_address.min' => 'Address looks too short — please add more detail.',
            'shipping_phone.regex' => 'Enter a valid Bangladeshi mobile number (e.g. 01712345678).',
            'district_id.required' => 'Please select your district.',
        ]);

        return DB::transaction(function () use ($data, $customerId) {
            $district = District::findOrFail($data['district_id']);

            $productIds = collect($data['items'])->pluck('product_id');
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0;
            $lineItems = [];

            foreach ($data['items'] as $item) {
                $product = $products->get($item['product_id']);

                if (! $product || $product->quantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ['Insufficient stock for '.($product?->name ?? 'one of the selected products').'.'],
                    ]);
                }

                $lineItems[] = [
                    'product' => $product,
                    'quantity' => $item['quantity'],
                ];
                $subtotal += $product->price * $item['quantity'];
            }

            $order = Order::create([
                'customer_id' => $customerId,
                'district_id' => $district->id,
                'delivery_charge' => $district->delivery_charge,
                'status' => 'pending',
                'shipping_name' => $data['shipping_name'],
                'shipping_address' => $data['shipping_address'],
                'shipping_phone' => $data['shipping_phone'],
                'total' => $subtotal + $district->delivery_charge,
            ]);

            foreach ($lineItems as $lineItem) {
                $product = $lineItem['product'];

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_image' => $product->image_url,
                    'seller_id' => $product->seller_id,
                    'quantity' => $lineItem['quantity'],
                    'unit_price' => $product->price,
                ]);

                $product->decrement('quantity', $lineItem['quantity']);
            }

            return $order;
        });
    }

    public function myOrders(Request $request)
    {
        return $request->user()->orders()->with('items.product', 'district')->latest()->paginate(10);
    }

    public function sellerOrders(Request $request)
    {
        $sellerId = $request->user()->id;

        return Order::whereHas('items', fn ($q) => $q->where('seller_id', $sellerId))
            ->with(['items' => fn ($q) => $q->where('seller_id', $sellerId), 'items.product', 'customer:id,name,phone,email', 'district'])
            ->latest()
            ->paginate(10);
    }

    public function adminOrders(Request $request)
    {
        $query = Order::with('items.product', 'customer:id,name,phone,email', 'district');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('shipping_name', 'like', "%{$search}%")
                    ->orWhere('shipping_address', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        return $query->latest()->paginate(10);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $user = $request->user();

        if ($user->role === 'employee') {
            abort_unless($order->items()->where('seller_id', $user->id)->exists(), 403, 'Forbidden');
        } elseif (! in_array($user->role, ['admin', 'superadmin'], true)) {
            abort(403, 'Forbidden');
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])],
        ]);

        $order->update(['status' => $data['status']]);

        return response()->json($order);
    }
}
