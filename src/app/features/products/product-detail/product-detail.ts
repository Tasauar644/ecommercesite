import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { Product, ProductVariant } from '../../../core/models';
import { Loader } from '../../../shared/loader/loader';
import { ProductCard } from '../product-card/product-card';

const RELATED_COUNT = 4;

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink, ProductCard, Loader],
  template: `
    @if (product(); as product) {
      <div class="w-[92%] max-w-[2200px] mx-auto py-8">
        <div class="max-w-6xl mx-auto">
          <a routerLink="/products" class="text-sm text-gray-500 hover:text-brand-600">&larr; Back to products</a>

          <div class="grid md:grid-cols-2 gap-10 mt-4">
          <div>
            <div class="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
              @if (images().length > 0) {
                <img [src]="images()[imageIndex()]" [alt]="product.name" class="w-full h-full object-cover" />

                @if (images().length > 1) {
                  <button
                    type="button"
                    (click)="prevImage()"
                    class="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white shadow"
                    aria-label="Previous photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    (click)="nextImage()"
                    class="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white shadow"
                    aria-label="Next photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                }
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 12V4.5A2.25 2.25 0 0 1 5.25 2.25h13.5A2.25 2.25 0 0 1 21 4.5V12m-18 0v7.5A2.25 2.25 0 0 0 5.25 21.75h13.5A2.25 2.25 0 0 0 21 19.5V12m-18 0h18M8.25 8.25h.008v.008H8.25V8.25Z" />
                </svg>
              }
            </div>

            @if (images().length > 1) {
              <div class="flex gap-2 mt-3">
                @for (img of images(); track img; let i = $index) {
                  <button
                    type="button"
                    (click)="imageIndex.set(i)"
                    class="h-16 w-16 rounded-lg overflow-hidden border-2 transition"
                    [class]="i === imageIndex() ? 'border-brand-600' : 'border-transparent'"
                  >
                    <img [src]="img" alt="Thumbnail" class="w-full h-full object-cover" />
                  </button>
                }
              </div>
            }
          </div>

          <div>
            @if (product.category) {
              <span class="text-xs font-medium text-brand-600">{{ product.category.name }}</span>
            }
            <h1 class="text-3xl font-bold text-gray-900">{{ product.name }}</h1>
            <p class="text-3xl font-bold text-brand-600 mt-4">{{ displayPrice() | currency:'BDT':'symbol':'1.0-0' }}</p>
            <p class="text-gray-600 mt-4 leading-relaxed">{{ product.description }}</p>

            @if (product.variants && product.variants.length > 0) {
              <div class="mt-5">
                <p class="text-sm font-medium text-gray-700 mb-2">Color: {{ selectedVariant()?.color_name }}</p>
                <div class="flex flex-wrap gap-2">
                  @for (variant of product.variants; track variant.id) {
                    <button
                      type="button"
                      (click)="selectVariant(variant)"
                      class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition"
                      [class]="selectedVariant()?.id === variant.id ? 'border-brand-600 ring-2 ring-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'"
                    >
                      @if (variant.color_hex) {
                        <span class="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0" [style.background]="variant.color_hex"></span>
                      }
                      {{ variant.color_name }}
                      @if (variant.quantity === 0) {
                        <span class="text-xs text-gray-400">(out of stock)</span>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            <p class="text-sm mt-4" [class]="displayQuantity() > 0 ? 'text-green-600' : 'text-red-600'">
              {{ displayQuantity() > 0 ? displayQuantity() + ' in stock' : 'Out of stock' }}
            </p>

            @if (!auth.isEmployee() && !auth.isAdmin()) {
              <div class="flex items-center gap-3 mt-6">
                <input
                  type="number"
                  [value]="quantity()"
                  (input)="setQuantity($event)"
                  min="1"
                  [max]="displayQuantity()"
                  class="w-20 rounded-lg border border-gray-300 px-3 py-2"
                />
                <button
                  (click)="addToCart(product)"
                  [disabled]="displayQuantity() === 0"
                  class="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition"
                >
                  Add to cart
                </button>
              </div>
            }
          </div>
          </div>
        </div>

        @if (relatedLoading()) {
          <div class="mt-16">
            <h2 class="text-xl font-bold text-gray-900 mb-4">You may also like</h2>
            <app-loader [fullscreen]="false" [compact]="true" />
          </div>
        } @else if (relatedProducts().length > 0) {
          <div class="mt-16">
            <h2 class="text-xl font-bold text-gray-900 mb-4">You may also like</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              @for (related of relatedProducts(); track related.id) {
                <app-product-card [product]="related" (add)="cart.add($event)" />
              }
            </div>
          </div>
        }
      </div>
    } @else if (loading()) {
      <app-loader />
    } @else {
      <p class="text-center text-gray-500 py-16">Product not found.</p>
    }
  `,
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  cart = inject(CartService);
  auth = inject(AuthService);

  product = signal<Product | null>(null);
  loading = signal(true);
  quantity = signal(1);
  relatedProducts = signal<Product[]>([]);
  relatedLoading = signal(false);
  imageIndex = signal(0);
  selectedVariant = signal<ProductVariant | null>(null);

  images = computed(() => {
    const product = this.product();
    if (!product) return [];
    const variantImages = this.selectedVariant()?.images;
    if (variantImages?.length) return variantImages.map((img) => img.url);
    if (product.images?.length) return product.images.map((img) => img.url);
    return product.image_url ? [product.image_url] : [];
  });

  displayPrice = computed(() => this.selectedVariant()?.price ?? this.product()?.price ?? '0');
  displayQuantity = computed(() => this.selectedVariant()?.quantity ?? this.product()?.quantity ?? 0);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));

      this.loading.set(true);
      this.product.set(null);
      this.relatedProducts.set([]);
      this.relatedLoading.set(false);
      this.imageIndex.set(0);
      this.quantity.set(1);
      this.selectedVariant.set(null);

      this.productService.get(id).subscribe({
        next: (product) => {
          this.product.set(product);
          this.selectedVariant.set(product.variants?.[0] ?? null);
          this.loading.set(false);
          this.loadRelated(product);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  selectVariant(variant: ProductVariant) {
    this.selectedVariant.set(variant);
    this.imageIndex.set(0);
    this.quantity.set(1);
  }

  private loadRelated(product: Product) {
    this.relatedLoading.set(true);
    this.productService.recommendations(product.id).subscribe({
      next: (products) => {
        this.relatedProducts.set(products.slice(0, RELATED_COUNT));
        this.relatedLoading.set(false);
      },
      error: () => {
        this.relatedProducts.set([]);
        this.relatedLoading.set(false);
      },
    });
  }

  setQuantity(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.quantity.set(Math.max(1, value || 1));
  }

  addToCart(product: Product) {
    this.cart.add(product, this.quantity(), this.selectedVariant());
  }

  prevImage() {
    const count = this.images().length;
    this.imageIndex.update((i) => (i - 1 + count) % count);
  }

  nextImage() {
    const count = this.images().length;
    this.imageIndex.update((i) => (i + 1) % count);
  }
}
