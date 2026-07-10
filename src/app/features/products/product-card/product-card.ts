import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div
      class="group relative bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col"
      [class]="product.is_best_seller ? 'border-2 border-brand-600 animate-[best-seller-glow_2.2s_ease-in-out_infinite]' : 'border border-line'"
    >
      @if (product.is_best_seller) {
        <span class="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-brand-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-[0_6px_14px_rgba(181,88,58,0.4)] pointer-events-none animate-[best-seller-badge-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          🔥 Best Seller Today
        </span>
        <div class="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div class="absolute -top-[20%] left-0 w-[35%] h-[140%] bg-gradient-to-r from-transparent via-white/55 to-transparent animate-[best-seller-shimmer_2.8s_ease-in-out_infinite]"></div>
        </div>
      }
      <a [routerLink]="['/products', product.id]" class="relative block aspect-square bg-gray-100 overflow-hidden">
        @if (images().length > 0) {
          <img [src]="images()[currentIndex()]" [alt]="product.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />

          @if (images().length > 1) {
            <button
              type="button"
              (click)="prev($event)"
              class="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/80 text-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-white"
              aria-label="Previous photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              (click)="next($event)"
              class="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/80 text-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-white"
              aria-label="Next photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <div class="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
              @for (img of images(); track $index) {
                <span class="h-1.5 w-1.5 rounded-full" [class]="$index === currentIndex() ? 'bg-white' : 'bg-white/50'"></span>
              }
            </div>
          }
        } @else {
          <div class="w-full h-full flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 12V4.5A2.25 2.25 0 0 1 5.25 2.25h13.5A2.25 2.25 0 0 1 21 4.5V12m-18 0v7.5A2.25 2.25 0 0 0 5.25 21.75h13.5A2.25 2.25 0 0 0 21 19.5V12m-18 0h18M8.25 8.25h.008v.008H8.25V8.25Z" />
            </svg>
          </div>
        }
      </a>
      <div class="p-[18px] flex flex-col flex-1 gap-1.5">
        @if (product.category) {
          <span class="text-xs font-bold text-brand-700 uppercase tracking-wide">{{ product.category.name }}</span>
        }
        <a [routerLink]="['/products', product.id]" class="font-bold text-ink hover:text-brand-600 line-clamp-1">{{ product.name }}</a>
        <p class="text-[13.5px] text-sub line-clamp-2 flex-1">{{ product.description }}</p>
        <div class="flex items-center justify-between mt-2.5">
          <span class="font-serif text-lg font-extrabold text-ink">
            @if (hasVariants()) {
              <span class="text-xs font-sans font-semibold text-sub align-middle">From </span>
            }
            {{ product.price | currency:'BDT':'symbol':'1.0-0' }}
          </span>
          @if (!auth.isEmployee() && !auth.isAdmin()) {
            @if (hasVariants()) {
              <a
                [routerLink]="['/products', product.id]"
                class="text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-full px-4 py-2 transition"
              >
                Choose options
              </a>
            } @else {
              <button
                (click)="add.emit(product)"
                [disabled]="product.quantity === 0"
                class="text-sm font-bold bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 transition"
              >
                {{ product.quantity === 0 ? 'Out of stock' : 'Add to cart' }}
              </button>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class ProductCard {
  @Input({ required: true }) product!: Product;
  @Output() add = new EventEmitter<Product>();

  auth = inject(AuthService);

  currentIndex = signal(0);

  hasVariants = computed(() => (this.product.variants?.length ?? 0) > 0);

  images = computed(() => {
    if (this.product.images?.length) return this.product.images.map((img) => img.url);
    const firstVariantImages = this.product.variants?.[0]?.images;
    if (firstVariantImages?.length) return firstVariantImages.map((img) => img.url);
    return this.product.image_url ? [this.product.image_url] : [];
  });

  prev(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const count = this.images().length;
    this.currentIndex.update((i) => (i - 1 + count) % count);
  }

  next(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const count = this.images().length;
    this.currentIndex.update((i) => (i + 1) % count);
  }
}
