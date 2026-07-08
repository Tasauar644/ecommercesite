import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { DistrictService } from '../../../core/services/district.service';
import { OrderService } from '../../../core/services/order.service';
import { PaymentSettingService } from '../../../core/services/payment-setting.service';
import { District, PaymentMethod } from '../../../core/models';
import { isValidAddress, isValidBangladeshPhone } from '../../../core/utils/validators';

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      @if (placedOrderId(); as orderId) {
        <div class="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <p class="text-lg font-semibold text-gray-900 mb-2">Order #{{ orderId }} placed!</p>
          <p class="text-gray-500 mb-4">We'll use the phone number you provided for delivery updates.</p>
          <a routerLink="/products" class="text-brand-600 font-medium hover:underline">Continue shopping</a>
        </div>
      } @else if (cart.items().length === 0) {
        <div class="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <p class="text-gray-500 mb-4">Your cart is empty.</p>
          <a routerLink="/products" class="text-brand-600 font-medium hover:underline">Browse products</a>
        </div>
      } @else {
        <div class="grid md:grid-cols-5 gap-6">
          <form (ngSubmit)="submit()" class="md:col-span-3 bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 class="font-semibold text-gray-900">Shipping details</h2>

            @if (!auth.isLoggedIn()) {
              <div class="rounded-lg bg-brand-50 text-brand-700 text-sm px-3 py-2">
                Checking out as a guest. <a routerLink="/login" class="font-medium hover:underline">Log in</a> to track this order in your history.
              </div>
            }

            @if (error()) {
              <div class="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
            }

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input [(ngModel)]="shippingName" name="shippingName" required class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                [(ngModel)]="shippingAddress"
                name="shippingAddress"
                required
                placeholder="Enter your address"
                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                [class]="addressError() ? 'border-red-400' : 'border-gray-300'"
              />
              @if (addressError()) {
                <p class="text-xs text-red-600 mt-1">{{ addressError() }}</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                [(ngModel)]="shippingPhone"
                name="shippingPhone"
                required
                placeholder="Enter phone number"
                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                [class]="phoneError() ? 'border-red-400' : 'border-gray-300'"
              />
              @if (phoneError()) {
                <p class="text-xs text-red-600 mt-1">{{ phoneError() }}</p>
              }
            </div>
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                type="text"
                [ngModel]="districtSearch()"
                (ngModelChange)="districtSearch.set($event)"
                (focus)="districtDropdownOpen.set(true)"
                (blur)="onDistrictBlur()"
                name="districtSearch"
                required
                autocomplete="off"
                placeholder="Search your district..."
                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                [class]="districtError() ? 'border-red-400' : 'border-gray-300'"
              />
              @if (districtDropdownOpen()) {
                <ul
                  (mousedown)="$event.preventDefault()"
                  class="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  @if (filteredDistricts().length === 0) {
                    <li class="px-3 py-2 text-sm text-gray-400">No districts match.</li>
                  }
                  @for (d of filteredDistricts(); track d.id) {
                    <li>
                      <button
                        type="button"
                        (click)="selectDistrict(d)"
                        class="w-full text-left px-3 py-2 text-sm hover:bg-brand-50"
                      >
                        {{ d.name }} &mdash; {{ +d.delivery_charge | currency:'BDT':'symbol':'1.0-0' }} delivery
                      </button>
                    </li>
                  }
                </ul>
              }
              @if (districtError()) {
                <p class="text-xs text-red-600 mt-1">{{ districtError() }}</p>
              }
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="paymentMethod.set('cod')"
                  class="rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition"
                  [class]="paymentMethod() === 'cod' ? 'border-brand-600 ring-2 ring-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'"
                >
                  Cash on Delivery
                </button>
                <button
                  type="button"
                  (click)="paymentMethod.set('bkash')"
                  class="rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition"
                  [class]="paymentMethod() === 'bkash' ? 'border-brand-600 ring-2 ring-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'"
                >
                  bKash
                </button>
              </div>

              @if (paymentMethod() === 'bkash') {
                <div class="mt-3 rounded-lg bg-brand-50 text-brand-700 text-sm px-3 py-2.5 space-y-1">
                  @if (bkashNumber()) {
                    <p>
                      Send <strong>{{ grandTotal() | currency:'BDT':'symbol':'1.0-0' }}</strong> to bKash number
                      <strong>{{ bkashNumber() }}</strong> (Send Money), then enter the Transaction ID below.
                    </p>
                  } @else {
                    <p>bKash payment isn't set up yet — please choose Cash on Delivery.</p>
                  }
                </div>
                <input
                  [(ngModel)]="transactionId"
                  name="transactionId"
                  placeholder="bKash Transaction ID"
                  class="w-full mt-2 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  [class]="transactionIdError() ? 'border-red-400' : 'border-gray-300'"
                />
                @if (transactionIdError()) {
                  <p class="text-xs text-red-600 mt-1">{{ transactionIdError() }}</p>
                }
              }
            </div>

            <button
              type="submit"
              [disabled]="placing()"
              class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition"
            >
              {{ placing() ? 'Placing order...' : 'Place order' }}
            </button>
          </form>

          <div class="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 h-fit">
            <h2 class="font-semibold text-gray-900 mb-4">Order summary</h2>
            <div class="space-y-3 text-sm">
              @for (item of cart.items(); track item.product.id + '-' + (item.variant?.id ?? 0)) {
                <div class="flex justify-between">
                  <span class="text-gray-600">
                    {{ item.product.name }}{{ item.variant ? ' (' + item.variant.color_name + ')' : '' }} &times; {{ item.quantity }}
                  </span>
                  <span class="text-gray-900 font-medium">{{ item.quantity * +(item.variant?.price ?? item.product.price) | currency:'BDT':'symbol':'1.0-0' }}</span>
                </div>
              }
            </div>
            <div class="border-t border-gray-100 mt-4 pt-3 flex justify-between text-sm">
              <span class="text-gray-600">Subtotal</span>
              <span class="text-gray-900">{{ cart.total() | currency:'BDT':'symbol':'1.0-0' }}</span>
            </div>
            <div class="flex justify-between text-sm mt-1">
              <span class="text-gray-600">Delivery charge</span>
              <span class="text-gray-900">{{ deliveryCharge() | currency:'BDT':'symbol':'1.0-0' }}</span>
            </div>
            <div class="border-t border-gray-100 mt-3 pt-3 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{{ grandTotal() | currency:'BDT':'symbol':'1.0-0' }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CheckoutPage {
  cart = inject(CartService);
  auth = inject(AuthService);
  private orderService = inject(OrderService);
  private districtService = inject(DistrictService);
  private paymentSettingService = inject(PaymentSettingService);
  private router = inject(Router);

  shippingName = '';
  shippingAddress = '';
  shippingPhone = '';
  districtId = signal<number | null>(null);
  districts = signal<District[]>([]);
  districtSearch = signal('');
  districtDropdownOpen = signal(false);

  paymentMethod = signal<PaymentMethod>('cod');
  transactionId = '';
  transactionIdError = signal('');
  bkashNumber = signal<string | null>(null);

  filteredDistricts = computed(() => {
    const term = this.districtSearch().trim().toLowerCase();
    if (!term) return this.districts();
    return this.districts().filter((d) => d.name.toLowerCase().includes(term));
  });
  placing = signal(false);
  error = signal('');
  addressError = signal('');
  phoneError = signal('');
  districtError = signal('');
  placedOrderId = signal<number | null>(null);

  deliveryCharge = computed(() => {
    const district = this.districts().find((d) => d.id === this.districtId());
    return district ? +district.delivery_charge : 0;
  });

  grandTotal = computed(() => this.cart.total() + this.deliveryCharge());

  private wasLoggedIn = this.auth.isLoggedIn();

  constructor() {
    this.districtService.list().subscribe((districts) => this.districts.set(districts));
    this.paymentSettingService.get().subscribe((settings) => this.bkashNumber.set(settings.bkash_number));

    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.shippingName = currentUser.name;
      this.shippingPhone = currentUser.phone;
    }

    // Logging out mid-checkout abandons the flow: the form was pre-filled with
    // the logged-in customer's details (and AuthService.logout() already empties
    // the cart), so leaving this page in place would show a guest a stale,
    // pointless checkout form for someone else's order.
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      if (this.wasLoggedIn && !loggedIn) {
        this.router.navigateByUrl('/products');
      }
      this.wasLoggedIn = loggedIn;
    });
  }

  selectDistrict(d: District) {
    this.districtId.set(d.id);
    this.districtSearch.set(d.name);
    this.districtDropdownOpen.set(false);
  }

  onDistrictBlur() {
    this.districtDropdownOpen.set(false);
    const current = this.districts().find((d) => d.id === this.districtId());
    this.districtSearch.set(current ? current.name : '');
  }

  submit() {
    this.error.set('');
    this.addressError.set('');
    this.phoneError.set('');
    this.districtError.set('');
    this.transactionIdError.set('');

    if (!isValidAddress(this.shippingAddress)) {
      this.addressError.set('Enter a complete address, including a house/road number and area.');
    }
    if (!isValidBangladeshPhone(this.shippingPhone)) {
      this.phoneError.set('Enter a valid Bangladeshi mobile number (e.g. 01712345678).');
    }
    if (!this.districtId()) {
      this.districtError.set('Please select your district.');
    }
    if (this.paymentMethod() === 'bkash' && !this.transactionId.trim()) {
      this.transactionIdError.set('Enter the bKash Transaction ID.');
    }
    if (this.addressError() || this.phoneError() || this.districtError() || this.transactionIdError()) {
      return;
    }

    this.placing.set(true);

    const payload = {
      shipping_name: this.shippingName,
      shipping_address: this.shippingAddress,
      shipping_phone: this.shippingPhone,
      district_id: this.districtId()!,
      payment_method: this.paymentMethod(),
      payment_transaction_id: this.paymentMethod() === 'bkash' ? this.transactionId.trim() : undefined,
      items: this.cart.items().map((i) => ({
        product_id: i.product.id,
        variant_id: i.variant?.id,
        quantity: i.quantity,
      })),
    };

    const request = this.auth.isLoggedIn() ? this.orderService.place(payload) : this.orderService.placeGuest(payload);

    request.subscribe({
      next: (order) => {
        this.cart.clear();
        if (this.auth.isLoggedIn()) {
          this.router.navigateByUrl('/orders');
        } else {
          this.placedOrderId.set(order.id);
        }
      },
      error: (err) => {
        this.placing.set(false);
        const fieldErrors = err?.error?.errors;
        this.error.set(
          fieldErrors?.shipping_address?.[0] ||
            fieldErrors?.shipping_phone?.[0] ||
            err?.error?.message ||
            'Could not place your order.'
        );
      },
    });
  }
}
