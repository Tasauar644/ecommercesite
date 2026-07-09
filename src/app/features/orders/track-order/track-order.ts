import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderStatus } from '../../../core/models';

@Component({
  selector: 'app-track-order',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-8">
      <span class="text-xs font-bold text-brand-700 uppercase tracking-wide">Order status</span>
      <h1 class="font-serif font-semibold text-3xl text-ink mt-1 mb-6">Track your order</h1>

      <form (ngSubmit)="submit()" class="bg-white border border-line rounded-2xl p-6 space-y-4">
        <p class="text-sm text-sub -mt-1">
          Enter the phone number you used at checkout. If you remember your order number, add it to narrow the search — otherwise leave it blank and we'll show every order tied to that number.
        </p>

        @if (error()) {
          <div class="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
        }

        <div>
          <label class="block text-sm font-medium text-ink mb-1">Phone number</label>
          <input
            [(ngModel)]="phone"
            name="phone"
            required
            placeholder="e.g. 01712345678"
            class="w-full rounded-lg border border-line px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1">Order number <span class="text-sub font-normal">(optional)</span></label>
          <input
            [(ngModel)]="orderId"
            name="orderId"
            placeholder="e.g. 42"
            class="w-full rounded-lg border border-line px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          [disabled]="loading()"
          class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 transition"
        >
          {{ loading() ? 'Looking up...' : 'Track order' }}
        </button>
      </form>

      @if (orders().length > 0) {
        <div class="space-y-4 mt-6">
          @for (order of orders(); track order.id) {
            <div class="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
              <div class="flex items-center justify-between flex-wrap gap-2 px-5 py-4 bg-cream/60 border-b border-line">
                <div>
                  <p class="font-serif font-semibold text-ink">Order #{{ order.id }}</p>
                  <p class="text-sm text-sub">
                    {{ order.created_at | date: 'medium' }}@if (order.district?.name) { &middot; {{ order.district!.name }} }
                  </p>
                </div>
                <span class="text-xs font-bold px-3 py-1 rounded-full capitalize" [class]="statusClasses(order.status)">
                  {{ order.status }}
                </span>
              </div>

              <div class="px-5 py-4">
                <div class="divide-y divide-line">
                  @for (item of order.items; track item.id) {
                    <div class="flex items-center justify-between py-3 gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-14 w-14 rounded-xl bg-cream overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-line">
                          @if (item.product?.image_url || item.product_image) {
                            <img [src]="item.product?.image_url || item.product_image" [alt]="item.product?.name || item.product_name || ''" class="h-full w-full object-cover" />
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-line" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 12V4.5A2.25 2.25 0 0 1 5.25 2.25h13.5A2.25 2.25 0 0 1 21 4.5V12m-18 0v7.5A2.25 2.25 0 0 0 5.25 21.75h13.5A2.25 2.25 0 0 0 21 19.5V12m-18 0h18M8.25 8.25h.008v.008H8.25V8.25Z" />
                            </svg>
                          }
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-ink truncate">
                            {{ item.product?.name || item.product_name || 'Product removed' }}
                            @if (item.variant_color_name) { <span class="text-sub font-normal">({{ item.variant_color_name }})</span> }
                          </p>
                          <p class="text-xs text-sub">Qty {{ item.quantity }} &times; {{ item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</p>
                        </div>
                      </div>
                      <span class="text-ink font-semibold shrink-0">{{ item.quantity * +item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</span>
                    </div>
                  }
                </div>

                <div class="mt-3 pt-3 border-t border-line space-y-1">
                  <div class="flex justify-between text-sm text-sub">
                    <span>Delivery charge</span>
                    <span>{{ order.delivery_charge | currency:'BDT':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between font-semibold text-ink">
                    <span>Total</span>
                    <span>{{ order.total | currency:'BDT':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between text-sm text-sub pt-1">
                    <span>Payment</span>
                    <span>
                      {{ order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery' }}
                      @if (order.payment_transaction_id) { &middot; TrxID {{ order.payment_transaction_id }} }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <p class="text-center text-sm text-sub mt-6">
        Have an account? <a routerLink="/login" class="text-brand-600 font-medium hover:underline">Log in</a> to see your full order history.
      </p>
    </div>
  `,
})
export class TrackOrder {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);

  orderId = '';
  phone = '';
  loading = signal(false);
  error = signal('');
  orders = signal<Order[]>([]);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const orderId = params.get('order_id');
    const phone = params.get('phone');
    if (orderId) this.orderId = orderId;
    if (phone) this.phone = phone;
    if (phone) this.submit();
  }

  submit() {
    if (!this.phone.trim()) {
      this.error.set('Enter the phone number you used at checkout.');
      return;
    }

    this.error.set('');
    this.orders.set([]);
    this.loading.set(true);

    const id = this.orderId.trim() ? Number(this.orderId) : undefined;

    this.orderService.track(this.phone.trim(), id).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No orders found for that phone number.');
      },
    });
  }

  statusClasses(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      pending: 'bg-amber-100 text-amber-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-[#E3F3E7] text-[#2F7A4F]',
      cancelled: 'bg-red-100 text-red-800',
    };
    return map[status];
  }
}
