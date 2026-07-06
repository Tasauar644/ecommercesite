import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderStatus } from '../../../core/models';

@Component({
  selector: 'app-my-orders',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      @if (loading()) {
        <p class="text-gray-500">Loading orders...</p>
      } @else if (orders().length === 0) {
        <div class="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <p class="text-gray-500 mb-4">You haven't placed any orders yet.</p>
          <a routerLink="/products" class="text-brand-600 font-medium hover:underline">Browse products</a>
        </div>
      } @else {
        <div class="space-y-4">
          @for (order of orders(); track order.id) {
            <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div class="flex items-center justify-between flex-wrap gap-2 px-5 py-4 bg-gray-50/60 border-b border-gray-100">
                <div>
                  <p class="font-semibold text-gray-900">Order #{{ order.id }}</p>
                  <p class="text-sm text-gray-500">
                    {{ order.created_at | date: 'medium' }}@if (order.district?.name) { &middot; {{ order.district!.name }} }
                  </p>
                </div>
                <span class="text-xs font-medium px-3 py-1 rounded-full capitalize" [class]="statusClasses(order.status)">
                  {{ order.status }}
                </span>
              </div>

              <div class="px-5 py-4">
                <div class="divide-y divide-gray-100">
                  @for (item of order.items; track item.id) {
                    <div class="flex items-center justify-between py-3 gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-gray-200">
                          @if (item.product?.image_url || item.product_image) {
                            <img [src]="item.product?.image_url || item.product_image" [alt]="item.product?.name || item.product_name || ''" class="h-full w-full object-cover" />
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 12V4.5A2.25 2.25 0 0 1 5.25 2.25h13.5A2.25 2.25 0 0 1 21 4.5V12m-18 0v7.5A2.25 2.25 0 0 0 5.25 21.75h13.5A2.25 2.25 0 0 0 21 19.5V12m-18 0h18M8.25 8.25h.008v.008H8.25V8.25Z" />
                            </svg>
                          }
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ item.product?.name || item.product_name || 'Product removed' }}</p>
                          <p class="text-xs text-gray-500">Qty {{ item.quantity }} &times; {{ item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</p>
                        </div>
                      </div>
                      <span class="text-gray-900 font-medium shrink-0">{{ item.quantity * +item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</span>
                    </div>
                  }
                </div>

                <div class="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <div class="flex justify-between text-sm text-gray-500">
                    <span>Delivery charge</span>
                    <span>{{ order.delivery_charge | currency:'BDT':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>{{ order.total | currency:'BDT':'symbol':'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MyOrders {
  private orderService = inject(OrderService);

  orders = signal<Order[]>([]);
  loading = signal(true);

  constructor() {
    this.orderService.myOrders().subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusClasses(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return map[status];
  }
}
