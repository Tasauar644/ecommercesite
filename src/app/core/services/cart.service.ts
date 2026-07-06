import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../models';

const CART_KEY = 'cart_items';

@Injectable({ providedIn: 'root' })
export class CartService {
  private stored = sessionStorage.getItem(CART_KEY);
  items = signal<CartItem[]>(this.stored ? JSON.parse(this.stored) : []);

  count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  total = computed(() =>
    this.items().reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0)
  );

  add(product: Product, quantity = 1) {
    const items = [...this.items()];
    const existing = items.find((i) => i.product.id === product.id);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, product.quantity);
    } else {
      items.push({ product, quantity: Math.min(quantity, product.quantity) });
    }

    this.save(items);
  }

  updateQuantity(productId: number, quantity: number) {
    const items = this.items()
      .map((i) => (i.product.id === productId ? { ...i, quantity } : i))
      .filter((i) => i.quantity > 0);
    this.save(items);
  }

  remove(productId: number) {
    this.save(this.items().filter((i) => i.product.id !== productId));
  }

  clear() {
    this.save([]);
  }

  private save(items: CartItem[]) {
    this.items.set(items);
    sessionStorage.setItem(CART_KEY, JSON.stringify(items));
  }
}
