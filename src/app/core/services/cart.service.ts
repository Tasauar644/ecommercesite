import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product, ProductVariant } from '../models';

const CART_KEY = 'cart_items';

@Injectable({ providedIn: 'root' })
export class CartService {
  private stored = sessionStorage.getItem(CART_KEY);
  items = signal<CartItem[]>(this.stored ? JSON.parse(this.stored) : []);

  count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  total = computed(() =>
    this.items().reduce((sum, i) => sum + Number(i.variant?.price ?? i.product.price) * i.quantity, 0)
  );

  add(product: Product, quantity = 1, variant?: ProductVariant | null) {
    const items = [...this.items()];
    const existing = items.find((i) => this.matches(i, product.id, variant?.id));
    const maxQuantity = variant ? variant.quantity : product.quantity;

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, maxQuantity);
    } else {
      items.push({ product, variant, quantity: Math.min(quantity, maxQuantity) });
    }

    this.save(items);
  }

  updateQuantity(productId: number, quantity: number, variantId?: number) {
    const items = this.items()
      .map((i) => (this.matches(i, productId, variantId) ? { ...i, quantity } : i))
      .filter((i) => i.quantity > 0);
    this.save(items);
  }

  remove(productId: number, variantId?: number) {
    this.save(this.items().filter((i) => !this.matches(i, productId, variantId)));
  }

  clear() {
    this.save([]);
  }

  private matches(item: CartItem, productId: number, variantId?: number): boolean {
    return item.product.id === productId && (item.variant?.id ?? undefined) === variantId;
  }

  private save(items: CartItem[]) {
    this.items.set(items);
    sessionStorage.setItem(CART_KEY, JSON.stringify(items));
  }
}
