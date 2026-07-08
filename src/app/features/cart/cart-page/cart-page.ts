import { CurrencyPipe } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { CartItem } from '../../../core/models';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>

      @if (cart.items().length === 0) {
        <div class="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <p class="text-gray-500 mb-4">Your cart is empty.</p>
          <a routerLink="/products" class="text-brand-600 font-medium hover:underline">Browse products</a>
        </div>
      } @else {
        <div class="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          @for (item of cart.items(); track item.product.id + '-' + (item.variant?.id ?? 0)) {
            <div class="flex items-center gap-4 p-4">
              <div class="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                @if (item.variant?.images?.[0]?.url || item.product.image_url) {
                  <img [src]="item.variant?.images?.[0]?.url || item.product.image_url" [alt]="item.product.name" class="h-full w-full object-cover" />
                } @else {
                  <span class="text-xs text-gray-300">No image</span>
                }
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ item.product.name }}</p>
                @if (item.variant) {
                  <p class="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    @if (item.variant.color_hex) {
                      <span class="h-2.5 w-2.5 rounded-full border border-gray-200 shrink-0" [style.background]="item.variant.color_hex"></span>
                    }
                    {{ item.variant.color_name }}
                  </p>
                }
                <p class="text-sm text-gray-500">{{ (item.variant?.price ?? item.product.price) | currency:'BDT':'symbol':'1.0-0' }} each</p>
              </div>

              <input
                type="number"
                [value]="item.quantity"
                min="1"
                [max]="item.variant?.quantity ?? item.product.quantity"
                (change)="updateQuantity(item, $event)"
                class="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center"
              />

              <p class="w-20 text-right font-medium text-gray-900">{{ item.quantity * +(item.variant?.price ?? item.product.price) | currency:'BDT':'symbol':'1.0-0' }}</p>

              <button (click)="cart.remove(item.product.id, item.variant?.id)" class="text-gray-400 hover:text-red-600" aria-label="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          }
        </div>

        <div class="flex items-center justify-between mt-6 bg-white border border-gray-200 rounded-2xl p-5">
          <span class="text-lg font-semibold text-gray-900">Total: {{ cart.total() | currency:'BDT':'symbol':'1.0-0' }}</span>
          <a routerLink="/checkout" class="bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-full px-6 py-2.5 transition">
            Proceed to checkout
          </a>
        </div>
      }
    </div>
  `,
})
export class CartPage {
  cart = inject(CartService);
  private auth = inject(AuthService);
  private router = inject(Router);

  private wasLoggedIn = this.auth.isLoggedIn();

  constructor() {
    // Logging out while viewing the cart empties it (see AuthService.logout) —
    // there's nothing left to look at, so send the now-guest session onward.
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      if (this.wasLoggedIn && !loggedIn) {
        this.router.navigateByUrl('/products');
      }
      this.wasLoggedIn = loggedIn;
    });
  }

  updateQuantity(item: CartItem, event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.cart.updateQuantity(item.product.id, Math.max(1, value || 1), item.variant?.id);
  }
}
