import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer, Order, OrderStatus } from '../../../core/models';

@Component({
  selector: 'app-admin-customers',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div class="grid md:grid-cols-5 gap-6">
      <div class="md:col-span-2 bg-white border border-line rounded-2xl overflow-hidden flex flex-col max-h-[75vh]">
        <div class="px-6 py-4 border-b border-line shrink-0">
          <h2 class="font-serif font-semibold text-lg text-ink mb-3">Customers</h2>
          <form (ngSubmit)="search()" class="flex gap-2">
            <input
              [(ngModel)]="searchTerm"
              name="searchTerm"
              placeholder="Search by name, username,"
              class="flex-1 rounded-full border border-line px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full px-4 text-sm transition">Search</button>
          </form>
        </div>

        <div class="overflow-y-auto">
          @if (loading()) {
            <p class="text-sub text-sm p-6">Loading...</p>
          } @else if (customers().length === 0) {
            <p class="text-sub text-sm p-6">No customers found.</p>
          } @else {
            <ul class="divide-y divide-line">
              @for (customer of customers(); track customer.id) {
                <li>
                  <button
                    (click)="select(customer)"
                    class="w-full flex items-center gap-3 text-left px-6 py-3.5 transition"
                    [class]="selected()?.id === customer.id ? 'bg-brand-600' : 'hover:bg-cream'"
                  >
                    <span
                      class="h-9 w-9 rounded-full flex items-center justify-center font-serif font-semibold text-sm shrink-0"
                      [class]="selected()?.id === customer.id ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'"
                    >
                      {{ initials(customer.name) }}
                    </span>
                    <span class="flex-1 min-w-0">
                      <p class="font-semibold truncate" [class]="selected()?.id === customer.id ? 'text-white' : 'text-ink'">{{ customer.name }}</p>
                      <p class="text-xs truncate" [class]="selected()?.id === customer.id ? 'text-white/80' : 'text-sub'">
                        &#64;{{ customer.username }} &middot; {{ customer.phone }}
                      </p>
                    </span>
                    <span
                      class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      [class]="selected()?.id === customer.id ? 'bg-white/20 text-white' : 'bg-cream text-sub'"
                    >
                      {{ customer.orders_count ?? 0 }} order{{ (customer.orders_count ?? 0) === 1 ? '' : 's' }}
                    </span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <div class="md:col-span-3 bg-white border border-line rounded-2xl flex flex-col max-h-[75vh] overflow-hidden">
        @if (!selected()) {
          <p class="text-sub text-sm p-6">Select a customer to view their order history.</p>
        } @else if (loadingOrders()) {
          <p class="text-sub text-sm p-6">Loading order history...</p>
        } @else {
          <div class="px-6 pt-6 shrink-0">
            <div class="flex items-center gap-3 mb-5">
              <span class="h-11 w-11 rounded-full bg-brand-600 text-white flex items-center justify-center font-serif font-semibold shrink-0">
                {{ initials(selected()!.name) }}
              </span>
              <div class="min-w-0">
                <h2 class="font-serif font-semibold text-lg text-ink">{{ selected()!.name }}</h2>
                <p class="text-sm text-sub truncate">
                  &#64;{{ selected()!.username }} &middot; {{ selected()!.phone }}
                  @if (selected()!.email) { &middot; {{ selected()!.email }} }
                </p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-6">
              <div class="border border-line rounded-xl px-4 py-3">
                <p class="text-[11px] font-bold text-sub uppercase tracking-wide">Total orders</p>
                <p class="font-serif font-semibold text-lg text-ink mt-1">{{ selected()!.orders_count ?? 0 }}</p>
              </div>
              <div class="border border-line rounded-xl px-4 py-3">
                <p class="text-[11px] font-bold text-sub uppercase tracking-wide">Total spent</p>
                <p class="font-serif font-semibold text-lg text-ink mt-1">{{ +(selected()!.orders_sum_total ?? 0) | currency:'BDT':'symbol':'1.0-0' }}</p>
              </div>
              <div class="border border-line rounded-xl px-4 py-3">
                <p class="text-[11px] font-bold text-sub uppercase tracking-wide">Last order</p>
                <p class="font-serif font-semibold text-lg text-ink mt-1">
                  {{ selected()!.orders_max_created_at ? (selected()!.orders_max_created_at | date: 'MMM d') : '—' }}
                </p>
              </div>
            </div>
          </div>

          <div class="overflow-y-auto px-6 pb-6">
            @if (orders().length === 0) {
              <p class="text-sub text-sm">No orders yet.</p>
            } @else {
              <div class="space-y-4">
                @for (order of orders(); track order.id) {
                  <div class="border border-line rounded-xl overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-3 bg-cream/60 border-b border-line">
                      <p class="font-serif font-semibold text-ink">Order #{{ order.id }}</p>
                      <span class="text-xs font-bold px-2.5 py-1 rounded-full capitalize" [class]="statusClasses(order.status)">{{ order.status }}</span>
                    </div>
                    <div class="p-4">
                      <p class="text-xs text-sub mb-2.5">
                        {{ order.created_at | date: 'medium' }}@if (order.district?.name) { &middot; {{ order.district!.name }} }
                      </p>
                      <div class="divide-y divide-line text-sm">
                        @for (item of order.items; track item.id) {
                          <div class="flex items-center justify-between py-2.5 gap-3">
                            <div class="flex items-center gap-2.5 min-w-0">
                              <div class="h-11 w-11 rounded-lg bg-cream overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-line">
                                @if (item.product?.image_url || item.product_image) {
                                  <img [src]="item.product?.image_url || item.product_image" [alt]="item.product?.name || item.product_name || ''" class="h-full w-full object-cover" />
                                }
                              </div>
                              <span class="text-brand-700 font-medium truncate">
                                {{ item.product?.name || item.product_name || 'Product removed' }}{{ item.variant_color_name ? ' (' + item.variant_color_name + ')' : '' }} &times; {{ item.quantity }}
                              </span>
                            </div>
                            <span class="text-ink font-semibold shrink-0">{{ item.quantity * +item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</span>
                          </div>
                        }
                      </div>
                      <div class="flex justify-between mt-2.5 text-sm text-brand-700 font-medium">
                        <span>Delivery charge</span>
                        <span class="text-sub">{{ order.delivery_charge | currency:'BDT':'symbol':'1.0-0' }}</span>
                      </div>
                      <div class="flex justify-between mt-1.5 pt-2.5 border-t border-line font-bold text-ink text-sm">
                        <span>Total</span>
                        <span>{{ order.total | currency:'BDT':'symbol':'1.0-0' }}</span>
                      </div>
                      <div class="flex justify-between mt-1.5 text-xs text-sub">
                        <span>Payment</span>
                        <span>
                          {{ order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery' }}
                          @if (order.payment_transaction_id) { &middot; TrxID {{ order.payment_transaction_id }} }
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminCustomers {
  private customerService = inject(CustomerService);

  customers = signal<Customer[]>([]);
  loading = signal(true);
  selected = signal<Customer | null>(null);
  orders = signal<Order[]>([]);
  loadingOrders = signal(false);
  searchTerm = '';

  constructor() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.customerService.list(this.searchTerm || undefined).subscribe({
      next: (res) => {
        this.customers.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  search() {
    this.load();
  }

  select(customer: Customer) {
    this.selected.set(customer);
    this.loadingOrders.set(true);

    this.customerService.show(customer.id).subscribe({
      next: (res) => {
        this.selected.set(res);
        this.orders.set(res.orders);
        this.loadingOrders.set(false);
      },
      error: () => this.loadingOrders.set(false),
    });
  }

  initials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  statusClasses(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-[#E3F3E7] text-[#2F7A4F]';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
    }
  }
}
