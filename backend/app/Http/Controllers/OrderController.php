<?php

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $order = $this->createOrder($request, $request->user()->id);

        return response()->json($order->load('items.product', 'items.variant', 'district'), 201);
    }

    public function guestStore(Request $request)
    {
        $order = $this->createOrder($request, null);

        return response()->json($order->load('items.product', 'items.variant', 'district'), 201);
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
            'payment_method' => ['required', Rule::in(['cod', 'bkash'])],
            'payment_transaction_id' => ['required_if:payment_method,bkash', 'nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ], [
            'shipping_address.regex' => 'Enter a complete address, including a house/road number and area (e.g. House 12, Road 5, Dhanmondi, Dhaka).',
            'shipping_address.min' => 'Address looks too short — please add more detail.',
            'shipping_phone.regex' => 'Enter a valid Bangladeshi mobile number (e.g. 01712345678).',
            'district_id.required' => 'Please select your district.',
        ]);

        return DB::transaction(function () use ($data, $customerId) {
            $district = District::findOrFail($data['district_id']);

            if ($district->name !== 'Dhaka' && $data['payment_method'] === 'cod') {
                throw ValidationException::withMessages([
                    'payment_method' => ['Cash on Delivery is only available within Dhaka. For delivery outside Dhaka, please pay in full via bKash.'],
                ]);
            }

            $productIds = collect($data['items'])->pluck('product_id');
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            $variantIds = collect($data['items'])->pluck('variant_id')->filter();
            $variants = ProductVariant::whereIn('id', $variantIds)->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0;
            $lineItems = [];

            foreach ($data['items'] as $item) {
                $product = $products->get($item['product_id']);
                $variant = isset($item['variant_id']) ? $variants->get($item['variant_id']) : null;

                // Stock and price come from the chosen color variant when one was selected;
                // plain (non-variant) products fall back to their own price/quantity.
                $availableQuantity = $variant ? $variant->quantity : $product?->quantity;
                $unitPrice = $variant ? $variant->price : $product?->price;

                if (! $product || ($variant && $variant->product_id !== $product->id) || $availableQuantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ['Insufficient stock for '.($product?->name ?? 'one of the selected products').'.'],
                    ]);
                }

                $lineItems[] = [
                    'product' => $product,
                    'variant' => $variant,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                ];
                $subtotal += $unitPrice * $item['quantity'];
            }

            $order = Order::create([
                'customer_id' => $customerId,
                'district_id' => $district->id,
                'delivery_charge' => $district->delivery_charge,
                'status' => 'pending',
                'payment_method' => $data['payment_method'],
                'payment_transaction_id' => $data['payment_transaction_id'] ?? null,
                'shipping_name' => $data['shipping_name'],
                'shipping_address' => $data['shipping_address'],
                'shipping_phone' => $data['shipping_phone'],
                'total' => $subtotal + $district->delivery_charge,
            ]);

            foreach ($lineItems as $lineItem) {
                $product = $lineItem['product'];
                $variant = $lineItem['variant'];

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_variant_id' => $variant?->id,
                    'variant_color_name' => $variant?->color_name,
                    'product_name' => $product->name,
                    'product_image' => $variant?->images[0]['url'] ?? $product->image_url,
                    'seller_id' => $product->seller_id,
                    'quantity' => $lineItem['quantity'],
                    'unit_price' => $lineItem['unit_price'],
                ]);

                if ($variant) {
                    $variant->decrement('quantity', $lineItem['quantity']);
                    $product->decrement('quantity', $lineItem['quantity']);
                } else {
                    $product->decrement('quantity', $lineItem['quantity']);
                }
            }

            return $order;
        });
    }

    public function track(Request $request)
    {
        // Order number is optional — a guest who lost it can still look up every
        // order tied to their phone number; giving it just narrows to one.
        $data = $request->validate([
            'order_id' => ['nullable', 'integer'],
            'phone' => ['required', 'string'],
        ]);

        $normalizedPhone = $this->normalizePhone($data['phone']);

        // Guest lookup only — an order tied to a registered customer account should only be
        // visible by logging in. Otherwise anyone who knows a customer's phone number could
        // see their full order history without ever knowing their password.
        $query = Order::whereNull('customer_id')->whereRaw(
            "RIGHT(REPLACE(REPLACE(REPLACE(shipping_phone, '+', ''), ' ', ''), '-', ''), 10) = ?",
            [$normalizedPhone]
        );

        if (! empty($data['order_id'])) {
            $query->where('id', $data['order_id']);
        }

        $orders = $query->with('items.product', 'items.variant', 'district')->latest()->get();

        abort_if($orders->isEmpty(), 404, 'No orders found for that phone number.');

        return response()->json($orders);
    }

    // BD mobile numbers get typed with/without a leading 0 or +880/880 country code
    // interchangeably; compare on the bare 10-digit subscriber number so all forms match.
    private function normalizePhone(string $phone): string
    {
        return substr(preg_replace('/\D/', '', $phone), -10);
    }

    public function myOrders(Request $request)
    {
        return $request->user()->orders()->with('items.product', 'items.variant', 'district')->latest()->paginate(10);
    }

    public function sellerOrders(Request $request)
    {
        $sellerId = $request->user()->id;

        return Order::whereHas('items', fn ($q) => $q->where('seller_id', $sellerId))
            ->with(['items' => fn ($q) => $q->where('seller_id', $sellerId), 'items.product', 'items.variant', 'customer:id,name,phone,email', 'district'])
            ->latest()
            ->paginate(10);
    }

    public function adminOrders(Request $request)
    {
        $query = Order::with('items.product', 'items.variant', 'customer:id,name,phone,email', 'district');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('shipping_name', 'like', "%{$search}%")
                    ->orWhere('shipping_address', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($checkoutType = $request->query('checkout_type')) {
            if ($checkoutType === 'guest') {
                $query->whereNull('customer_id');
            } elseif ($checkoutType === 'account') {
                $query->whereNotNull('customer_id');
            }
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
