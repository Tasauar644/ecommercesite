<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    private const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    public function index(Request $request)
    {
        $range = $this->normalizeRange((int) $request->query('range', 30));

        // Revenue only counts delivered orders — pending/processing/shipped
        // haven't actually earned yet, and cancelled never did.
        $revenueQuery = fn () => Order::where('status', 'delivered');

        $orderCounts = Order::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $orderCountsByStatus = collect(self::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($orderCounts[$s] ?? 0)]);

        $allTimeRevenue = (float) (clone $revenueQuery())->sum('total');
        $allTimeOrders = (clone $revenueQuery())->count();

        return response()->json([
            'revenue' => [
                'today' => (float) (clone $revenueQuery())->whereDate('created_at', today())->sum('total'),
                'week' => (float) (clone $revenueQuery())->where('created_at', '>=', now()->startOfWeek())->sum('total'),
                'month' => (float) (clone $revenueQuery())->where('created_at', '>=', now()->startOfMonth())->sum('total'),
                'all_time' => $allTimeRevenue,
            ],
            'order_counts' => $orderCountsByStatus,
            'total_orders' => (int) $orderCountsByStatus->sum(),
            'avg_order_value' => $allTimeOrders > 0 ? round($allTimeRevenue / $allTimeOrders, 2) : 0,
            'sales_over_time' => $this->salesOverTime($range),
            'top_products' => $this->topProducts($range),
        ]);
    }

    private function salesOverTime(int $range): array
    {
        $start = now()->subDays($range - 1)->startOfDay();

        $rows = Order::selectRaw('DATE(created_at) as d, SUM(total) as revenue, COUNT(*) as orders')
            ->where('status', 'delivered')
            ->where('created_at', '>=', $start)
            ->groupBy('d')
            ->get()
            ->keyBy('d');

        // Fill every day in the range, including zero-order days — a gapped
        // series would draw a misleading straight line across missing days.
        $days = [];
        for ($i = 0; $i < $range; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $row = $rows->get($date);
            $days[] = [
                'date' => $date,
                'revenue' => $row ? (float) $row->revenue : 0,
                'orders' => $row ? (int) $row->orders : 0,
            ];
        }

        return $days;
    }

    // Every category's share of total revenue, sorted highest first — the
    // frontend picks which 5 (auto top-5, or admin-chosen) to chart. Percent
    // is against the grand total across ALL categories, so it's a true share.
    // Joins through the live products table (order_items don't snapshot a
    // category), so a sold-out-and-deleted product's history drops out here.
    public function categories(Request $request)
    {
        $range = $this->normalizeRange((int) $request->query('range', 30));
        $start = now()->subDays($range - 1)->startOfDay();

        $rows = OrderItem::query()
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'delivered')
            ->where('orders.created_at', '>=', $start)
            ->selectRaw('categories.id, categories.name, SUM(order_items.quantity) as units_sold, SUM(order_items.quantity * order_items.unit_price) as revenue')
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        $totalRevenue = (float) $rows->sum('revenue');

        return response()->json([
            'categories' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'units_sold' => (int) $row->units_sold,
                'revenue' => (float) $row->revenue,
                'percent' => $totalRevenue > 0 ? round($row->revenue / $totalRevenue * 100, 1) : 0,
            ])->values(),
        ]);
    }

    // Flat product list for the range — name, category, average unit price,
    // quantity sold, and line total. Unfiltered here; the admin filters to one
    // category client-side by clicking a slice in the categories chart, and
    // the totals footer recomputes from this same list, so it never drifts
    // from what the categories chart shows.
    public function products(Request $request)
    {
        $range = $this->normalizeRange((int) $request->query('range', 30));
        $start = now()->subDays($range - 1)->startOfDay();

        $rows = OrderItem::query()
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'delivered')
            ->where('orders.created_at', '>=', $start)
            ->selectRaw('order_items.product_id, order_items.product_name, categories.id as category_id, categories.name as category_name, SUM(order_items.quantity) as units_sold, SUM(order_items.quantity * order_items.unit_price) as revenue')
            ->groupBy('order_items.product_id', 'order_items.product_name', 'categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        $products = $rows->map(fn ($row) => [
            'id' => $row->product_id,
            'name' => $row->product_name,
            'category_id' => $row->category_id,
            'category' => $row->category_name,
            'units_sold' => (int) $row->units_sold,
            'unit_price' => $row->units_sold > 0 ? round($row->revenue / $row->units_sold, 2) : 0,
            'total' => (float) $row->revenue,
        ]);

        return response()->json([
            'products' => $products->values(),
            'total_units_sold' => (int) $products->sum('units_sold'),
            'total_revenue' => (float) $products->sum('total'),
        ]);
    }

    private function normalizeRange(int $range): int
    {
        return in_array($range, [7, 30, 90], true) ? $range : 30;
    }

    private function topProducts(int $range): array
    {
        $start = now()->subDays($range - 1)->startOfDay();

        return OrderItem::query()
            ->selectRaw('product_id, product_name, product_image, SUM(quantity) as units_sold, SUM(quantity * unit_price) as revenue')
            ->whereHas('order', fn ($q) => $q->where('status', 'delivered')->where('created_at', '>=', $start))
            ->groupBy('product_id', 'product_name', 'product_image')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->product_id,
                'name' => $row->product_name,
                'image_url' => $row->product_image,
                'units_sold' => (int) $row->units_sold,
                'revenue' => (float) $row->revenue,
            ])
            ->values()
            ->all();
    }
}
