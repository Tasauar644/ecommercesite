import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { SmartSearchInterpreted, SmartSearchService } from '../../../core/services/smart-search.service';
import { Category, Product } from '../../../core/models';
import { Loader } from '../../../shared/loader/loader';
import { HeroCarousel } from '../hero-carousel/hero-carousel';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-product-list',
  imports: [ProductCard, FormsModule, HeroCarousel, NgTemplateOutlet, Loader],
  template: `
    <div class="w-[92%] max-w-[2200px] mx-auto py-8">
      @if (!search()) {
        <div class="mb-8">
          <app-hero-carousel />
        </div>
      }

      <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 class="font-serif font-semibold text-3xl text-ink">
          {{ search() ? 'Results for "' + search() + '"' : 'All Products' }}
        </h1>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="mobileFiltersOpen.set(true)"
            class="md:hidden text-sm font-semibold border border-line rounded-full px-4 py-2 text-ink hover:bg-cream transition inline-flex items-center gap-1.5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Filters
            @if (selectedCategoryIds().length > 0 || minPrice() > 0 || maxPrice() < maxPriceBound) {
              <span class="h-1.5 w-1.5 rounded-full bg-brand-600"></span>
            }
          </button>
          @if (search()) {
            <button
              type="button"
              (click)="runSmartSearch()"
              [disabled]="aiSearching()"
              class="text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 disabled:opacity-60 rounded-full px-4 py-2 transition"
            >
              {{ aiSearching() ? '✨ Asking AI...' : '✨ Try AI search' }}
            </button>
          }
        </div>
      </div>

      <ng-template #filtersTpl>
        <div class="mb-6">
          <h2 class="text-sm font-bold text-ink mb-3">Price range</h2>
          <div class="flex items-center justify-between text-xs text-sub mb-2">
            <span>BDT {{ minPrice() }}</span>
            <span>BDT {{ maxPrice() === maxPriceBound ? maxPriceBound + '+' : maxPrice() }}</span>
          </div>
          <div class="relative h-5">
            <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-line"></div>
            <div
              class="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-brand-600"
              [style.left.%]="(minPrice() / maxPriceBound) * 100"
              [style.right.%]="100 - (maxPrice() / maxPriceBound) * 100"
            ></div>
            <input
              type="range"
              [min]="0"
              [max]="maxPriceBound"
              [step]="100"
              [ngModel]="minPrice()"
              (ngModelChange)="onMinPriceChange($event)"
              name="minPrice"
              class="range-thumb absolute inset-x-0 top-1/2 -translate-y-1/2 w-full"
            />
            <input
              type="range"
              [min]="0"
              [max]="maxPriceBound"
              [step]="100"
              [ngModel]="maxPrice()"
              (ngModelChange)="onMaxPriceChange($event)"
              name="maxPrice"
              class="range-thumb absolute inset-x-0 top-1/2 -translate-y-1/2 w-full"
            />
          </div>
        </div>

        <div class="mb-5">
          <h2 class="text-sm font-bold text-ink mb-3">Category</h2>
          <div class="space-y-2">
            @for (category of categories(); track category.id) {
              <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  [checked]="selectedCategoryIds().includes(category.id)"
                  (change)="toggleCategory(category.id)"
                  class="h-4 w-4 rounded accent-brand-600"
                />
                {{ category.name }}
              </label>
            }
          </div>
        </div>

        @if (selectedCategoryIds().length > 0 || minPrice() > 0 || maxPrice() < maxPriceBound) {
          <button type="button" (click)="clearFilters()" class="w-full text-sm font-semibold border border-line rounded-full py-2 text-ink hover:bg-cream transition">
            Clear filters
          </button>
        }
      </ng-template>

      @if (mobileFiltersOpen()) {
        <div class="fixed inset-0 bg-black/40 z-40 md:hidden" (click)="mobileFiltersOpen.set(false)">
          <div class="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white p-5 overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-serif font-semibold text-lg text-ink">Filters</h2>
              <button
                type="button"
                (click)="mobileFiltersOpen.set(false)"
                aria-label="Close"
                class="h-8 w-8 rounded-full bg-cream hover:bg-line flex items-center justify-center text-sub transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <ng-container [ngTemplateOutlet]="filtersTpl"></ng-container>
            <button
              type="button"
              (click)="mobileFiltersOpen.set(false)"
              class="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full py-2.5 transition"
            >
              Show results
            </button>
          </div>
        </div>
      }

      <div class="flex gap-8 items-start">
        <aside class="w-64 shrink-0 bg-white border border-line rounded-2xl p-5 hidden md:block">
          <ng-container [ngTemplateOutlet]="filtersTpl"></ng-container>
        </aside>

        <div class="flex-1 min-w-0">
          @if (loading()) {
            <app-loader />
          } @else if (aiSearching()) {
            <p class="text-gray-500">Asking AI...</p>
          } @else if (displayProducts(); as shownProducts) {
            @if (shownProducts.length === 0) {
              <p class="text-gray-500">No products found.</p>
            } @else {
              <div #productGrid class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                @for (product of shownProducts; track product.id) {
                  <app-product-card [product]="product" (add)="addToCart($event)" />
                }
              </div>

              @if (!aiResults() && lastPage() > 1) {
                <div class="flex items-center justify-center gap-2 mt-10">
                  <button
                    type="button"
                    (click)="goToPage(currentPage() - 1)"
                    [disabled]="currentPage() === 1"
                    aria-label="Previous page"
                    class="h-9 w-9 rounded-full border border-line flex items-center justify-center text-ink hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </button>

                  @for (p of pageNumbers(); track p) {
                    <button
                      type="button"
                      (click)="goToPage(p)"
                      class="h-9 w-9 rounded-full text-sm font-semibold transition"
                      [class]="p === currentPage() ? 'bg-brand-600 text-white' : 'border border-line text-ink hover:bg-cream'"
                    >
                      {{ p }}
                    </button>
                  }

                  <button
                    type="button"
                    (click)="goToPage(currentPage() + 1)"
                    [disabled]="currentPage() === lastPage()"
                    aria-label="Next page"
                    class="h-9 w-9 rounded-full border border-line flex items-center justify-center text-ink hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </button>
                </div>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .range-thumb {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      pointer-events: none;
    }
    .range-thumb::-webkit-slider-thumb {
      -webkit-appearance: none;
      pointer-events: auto;
      height: 16px;
      width: 16px;
      border-radius: 999px;
      background: #b5583a;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(46, 38, 32, 0.35);
      cursor: pointer;
    }
    .range-thumb::-moz-range-thumb {
      pointer-events: auto;
      height: 16px;
      width: 16px;
      border-radius: 999px;
      background: #b5583a;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(46, 38, 32, 0.35);
      cursor: pointer;
    }
    .range-thumb::-webkit-slider-runnable-track {
      background: transparent;
    }
    .range-thumb::-moz-range-track {
      background: transparent;
    }
  `,
})
export class ProductList {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private smartSearchService = inject(SmartSearchService);
  private cart = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  search = signal<string | null>(null);

  aiSearching = signal(false);
  aiResults = signal<Product[] | null>(null);
  aiInterpreted = signal<SmartSearchInterpreted | null>(null);
  aiUsed = signal(false);

  maxPriceBound = 10000;
  mobileFiltersOpen = signal(false);
  selectedCategoryIds = signal<number[]>([]);
  minPrice = signal(0);
  maxPrice = signal(this.maxPriceBound);

  currentPage = signal(1);
  lastPage = signal(1);
  private productGrid = viewChild<ElementRef<HTMLDivElement>>('productGrid');

  displayProducts = computed(() => this.aiResults() ?? this.products());

  pageNumbers = computed(() => {
    const total = this.lastPage();
    const current = this.currentPage();
    const maxVisible = 7;
    if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1);

    let start = Math.max(1, current - 3);
    const end = Math.min(total, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  constructor() {
    this.categoryService.list().subscribe((categories) => this.categories.set(categories));

    this.route.queryParamMap.subscribe((params) => {
      this.search.set(params.get('search'));

      const categoryIdsParam = params.get('category_ids');
      this.selectedCategoryIds.set(
        categoryIdsParam
          ? categoryIdsParam
              .split(',')
              .map(Number)
              .filter((n) => !isNaN(n))
          : []
      );

      const minParam = params.get('min_price');
      this.minPrice.set(minParam ? Number(minParam) : 0);

      const maxParam = params.get('max_price');
      this.maxPrice.set(maxParam ? Number(maxParam) : this.maxPriceBound);

      this.currentPage.set(1);
      this.load();
    });
  }

  toggleCategory(id: number) {
    const current = this.selectedCategoryIds();
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    this.syncFiltersToUrl({ categoryIds: next });
  }

  onMinPriceChange(value: number) {
    this.syncFiltersToUrl({ minPrice: Math.min(value, this.maxPrice()) });
  }

  onMaxPriceChange(value: number) {
    this.syncFiltersToUrl({ maxPrice: Math.max(value, this.minPrice()) });
  }

  clearFilters() {
    this.syncFiltersToUrl({ categoryIds: [], minPrice: 0, maxPrice: this.maxPriceBound });
  }

  private syncFiltersToUrl(overrides: { categoryIds?: number[]; minPrice?: number; maxPrice?: number }) {
    const categoryIds = overrides.categoryIds ?? this.selectedCategoryIds();
    const minPrice = overrides.minPrice ?? this.minPrice();
    const maxPrice = overrides.maxPrice ?? this.maxPrice();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category_ids: categoryIds.length ? categoryIds.join(',') : null,
        min_price: minPrice > 0 ? minPrice : null,
        max_price: maxPrice < this.maxPriceBound ? maxPrice : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private load() {
    this.loading.set(true);
    this.aiResults.set(null);
    const categoryIds = this.selectedCategoryIds();
    const minPrice = this.minPrice() > 0 ? this.minPrice() : undefined;
    const maxPrice = this.maxPrice() < this.maxPriceBound ? this.maxPrice() : undefined;

    this.productService
      .list(this.search() ?? undefined, categoryIds.length ? categoryIds : undefined, this.currentPage(), minPrice, maxPrice)
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
          this.lastPage.set(res.last_page);
          this.loading.set(false);

          // No exact matches for a real search — offer the AI interpretation
          // automatically instead of making the user hunt for the button.
          if (this.search() && this.products().length === 0) {
            this.runSmartSearch();
          }
        },
        error: () => this.loading.set(false),
      });
  }

  runSmartSearch() {
    const query = this.search();
    if (!query || this.aiSearching()) return;

    this.aiSearching.set(true);
    this.smartSearchService.search(query).subscribe({
      next: (res) => {
        this.aiResults.set(res.products);
        this.aiInterpreted.set(res.interpreted);
        this.aiUsed.set(res.ai_used);
        this.aiSearching.set(false);
      },
      error: () => this.aiSearching.set(false),
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.lastPage() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.load();
    this.productGrid()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  addToCart(product: Product) {
    this.cart.add(product, 1);
  }
}
