import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { Category, Product } from '../../../core/models';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-product-list',
  imports: [ProductCard, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 class="font-serif font-semibold text-3xl text-ink">
          {{ search() ? 'Results for "' + search() + '"' : 'All Products' }}
        </h1>
        <div class="relative">
          <input
            type="text"
            [ngModel]="categorySearch()"
            (ngModelChange)="categorySearch.set($event)"
            (focus)="openCategoryDropdown()"
            (click)="openCategoryDropdown()"
            (blur)="onCategoryBlur()"
            autocomplete="off"
            placeholder="All categories"
            class="text-sm rounded-[10px] border border-line pl-3.5 pr-9 py-2.5 w-48 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sub transition"
            [class.rotate-180]="categoryDropdownOpen()"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          @if (categoryDropdownOpen()) {
            <ul
              (mousedown)="$event.preventDefault()"
              class="absolute right-0 z-10 mt-1 w-56 max-h-64 overflow-auto rounded-lg border border-line bg-white shadow-lg"
            >
              <li>
                <button
                  type="button"
                  (click)="selectCategory(null)"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-brand-50"
                  [class.font-semibold]="categoryId === null"
                >
                  All categories
                </button>
              </li>
              @for (category of filteredCategories(); track category.id) {
                <li>
                  <button
                    type="button"
                    (click)="selectCategory(category)"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-brand-50"
                    [class.font-semibold]="categoryId === category.id"
                  >
                    {{ category.name }}
                  </button>
                </li>
              }
              @if (filteredCategories().length === 0 && categorySearch().trim()) {
                <li class="px-3 py-2 text-sm text-gray-400">No categories match.</li>
              }
            </ul>
          }
        </div>
      </div>

      @if (loading()) {
        <p class="text-gray-500">Loading products...</p>
      } @else if (products().length === 0) {
        <p class="text-gray-500">No products found.</p>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          @for (product of products(); track product.id) {
            <app-product-card [product]="product" (add)="addToCart($event)" />
          }
        </div>
      }
    </div>
  `,
})
export class ProductList {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cart = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  search = signal<string | null>(null);
  categoryId: number | null = null;
  categorySearch = signal('');
  categoryDropdownOpen = signal(false);

  filteredCategories = computed(() => {
    const term = this.categorySearch().trim().toLowerCase();
    if (!term) return this.categories();
    return this.categories().filter((c) => c.name.toLowerCase().includes(term));
  });

  constructor() {
    this.categoryService.list().subscribe((categories) => {
      this.categories.set(categories);
      this.syncCategorySearchText();
    });

    this.route.queryParamMap.subscribe((params) => {
      this.search.set(params.get('search'));
      const categoryParam = params.get('category_id');
      this.categoryId = categoryParam ? Number(categoryParam) : null;
      this.syncCategorySearchText();
      this.load();
    });
  }

  openCategoryDropdown() {
    this.categoryDropdownOpen.set(true);
    // The field shows the currently selected category's name, which would
    // otherwise be used to filter the list down to just itself the moment it
    // opens. Clear it so the full list shows until the user actually types.
    this.categorySearch.set('');
  }

  selectCategory(category: Category | null) {
    this.categoryId = category?.id ?? null;
    this.categorySearch.set(category ? category.name : '');
    this.categoryDropdownOpen.set(false);
    this.onCategoryChange(this.categoryId);
  }

  onCategoryBlur() {
    this.categoryDropdownOpen.set(false);
    this.syncCategorySearchText();
  }

  private syncCategorySearchText() {
    const current = this.categories().find((c) => c.id === this.categoryId);
    this.categorySearch.set(current ? current.name : '');
  }

  onCategoryChange(categoryId: number | null) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category_id: categoryId },
      queryParamsHandling: 'merge',
    });
  }

  private load() {
    this.loading.set(true);
    this.productService.list(this.search() ?? undefined, this.categoryId ?? undefined).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addToCart(product: Product) {
    this.cart.add(product, 1);
  }
}
