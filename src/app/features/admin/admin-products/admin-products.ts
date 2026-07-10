import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BannerService } from '../../../core/services/banner.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { Banner, Category, Product } from '../../../core/models';
import { Loader } from '../../../shared/loader/loader';

const MAX_BANNERS = 4;

@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, FormsModule, RouterLink, Loader],
  template: `
    <div class="bg-white border border-line rounded-2xl p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h2 class="font-serif font-semibold text-lg text-ink">Best Seller Badge</h2>
        <p class="text-sm text-sub mt-1">
          Auto-detect highlights whichever product sold the most units today with a glowing "Best Seller Today" badge — on top of any products you mark manually below.
        </p>
      </div>
      <button
        type="button"
        (click)="toggleAutoBestSeller()"
        [disabled]="savingBestSellerSettings()"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 shrink-0"
        [class]="autoBestSellerEnabled() ? 'bg-brand-600' : 'bg-gray-300'"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
          [class]="autoBestSellerEnabled() ? 'translate-x-6' : 'translate-x-1'"
        ></span>
      </button>
    </div>

    <div class="bg-white border border-line rounded-2xl p-6 mb-6">
      <h2 class="font-serif font-semibold text-lg text-ink">Homepage Banners</h2>
      <p class="text-sm text-sub mt-1 mb-4">Up to {{ maxBanners }} photos shown in the rotating banner on the storefront homepage.</p>

      @if (bannerError()) {
        <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ bannerError() }}</div>
      }

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        @for (banner of banners(); track banner.id) {
          <div>
            <div class="relative aspect-video rounded-lg overflow-hidden border border-line">
              <img [src]="banner.image_url" alt="Banner" class="w-full h-full object-cover" />
              <button
                type="button"
                (click)="removeBanner(banner)"
                class="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                aria-label="Remove banner"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              [value]="banner.caption ?? ''"
              (change)="updateCaption(banner, $event)"
              placeholder="Caption (optional)"
              class="w-full mt-1.5 text-xs rounded-md border border-line px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        }
        @if (pendingBanner(); as pending) {
          <div>
            <div class="relative aspect-video rounded-lg overflow-hidden border-2 border-brand-400">
              <img [src]="pending.previewUrl" alt="New banner preview" class="w-full h-full object-cover" />
              <button
                type="button"
                (click)="cancelPendingBanner()"
                class="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                aria-label="Cancel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              [(ngModel)]="pendingCaption"
              name="pendingCaption"
              placeholder="Caption (optional)"
              class="w-full mt-1.5 text-xs rounded-md border border-line px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              (click)="confirmAddBanner()"
              [disabled]="addingBanner()"
              class="w-full mt-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-md py-1.5 transition"
            >
              {{ addingBanner() ? 'Adding...' : 'Add banner' }}
            </button>
          </div>
        } @else if (banners().length < maxBanners) {
          <label
            for="bannerUpload"
            class="aspect-video flex flex-col items-center justify-center gap-1 border-2 border-dashed border-line rounded-lg cursor-pointer bg-cream/40 hover:border-brand-400 hover:bg-brand-50/40 transition"
          >
            <span class="h-6 w-6 flex items-center justify-center text-brand-600 text-xl leading-none">+</span>
            <span class="text-xs text-brand-700 font-semibold">Add banner</span>
          </label>
        }
      </div>
      <input id="bannerUpload" type="file" accept="image/*" (change)="onBannerFileSelected($event)" class="hidden" />
    </div>

    <div class="bg-white border border-line rounded-2xl overflow-hidden">
      <div class="flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-b border-line">
        <h2 class="font-serif font-semibold text-lg text-ink">All Products</h2>
        <div class="flex items-center gap-3 flex-wrap">
          <form (ngSubmit)="load()" class="flex items-center gap-2">
            <input
              [(ngModel)]="search"
              name="search"
              placeholder="Search products..."
              class="text-sm rounded-full border border-line px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" class="text-sm bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full px-4 py-1.5 transition">Search</button>
          </form>
          <select [(ngModel)]="categoryId" (ngModelChange)="load()" class="text-sm rounded-full border border-line px-3 py-1.5">
            <option [ngValue]="null">All categories</option>
            @for (category of categories(); track category.id) {
              <option [ngValue]="category.id">{{ category.name }}</option>
            }
          </select>
          <button
            type="button"
            (click)="toggleBestSellerFilter()"
            class="text-sm font-medium rounded-full px-3.5 py-1.5 transition inline-flex items-center gap-1.5"
            [class]="bestSellerOnly() ? 'bg-brand-600 text-white' : 'border border-line text-sub hover:bg-cream'"
          >
            🔥 Best sellers only
          </button>
          @if (search || categoryId || bestSellerOnly()) {
            <button
              type="button"
              (click)="resetFilters()"
              aria-label="Reset filters"
              class="h-9 w-9 rounded-full border border-line text-sub hover:text-brand-600 hover:border-brand-300 flex items-center justify-center transition shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          }
          <a routerLink="/admin/products/new" class="bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-full px-5 py-2 transition text-sm">
            + Add product
          </a>
        </div>
      </div>

      @if (loading()) {
        <app-loader [fullscreen]="false" />
      } @else if (products().length === 0) {
        <p class="text-sub text-sm p-6">No products found.</p>
      } @else {
        <div class="max-h-[600px] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-cream text-left sticky top-0 z-10">
            <tr>
              <th class="px-4 py-3 text-[11px] font-bold text-sub uppercase tracking-wide">Product</th>
              <th class="px-4 py-3 text-[11px] font-bold text-sub uppercase tracking-wide">Category</th>
              <th class="px-4 py-3 text-[11px] font-bold text-sub uppercase tracking-wide">Employee</th>
              <th class="px-4 py-3 text-[11px] font-bold text-sub uppercase tracking-wide">Price</th>
              <th class="px-4 py-3 text-[11px] font-bold text-sub uppercase tracking-wide">Qty</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            @for (product of products(); track product.id) {
              <tr>
                <td class="px-4 py-4 flex items-center gap-3">
                  <div class="h-11 w-11 rounded-lg bg-cream overflow-hidden shrink-0 flex items-center justify-center">
                    @if (product.image_url) {
                      <img [src]="product.image_url" [alt]="product.name" class="h-full w-full object-cover" />
                    }
                  </div>
                  <span class="font-semibold text-ink">{{ product.name }}</span>
                  @if (product.is_best_seller) {
                    <span class="text-[11px] font-bold bg-brand-600 text-white rounded-full px-2 py-0.5 shrink-0">🔥 Best seller</span>
                  }
                </td>
                <td class="px-4 py-4">
                  <span class="block w-full text-xs font-semibold text-brand-700 bg-brand-100 rounded-full px-3 py-1.5">{{ product.category?.name || 'Uncategorized' }}</span>
                </td>
                <td class="px-4 py-4 text-sub">{{ product.seller?.name }}</td>
                <td class="px-4 py-4 font-bold text-ink">{{ product.price | currency:'BDT':'symbol':'1.0-0' }}</td>
                <td class="px-4 py-4 text-sub">{{ product.quantity }}</td>
                <td class="px-4 py-4 text-right space-x-3">
                  <a [routerLink]="['/admin/products', product.id, 'edit']" class="text-brand-600 font-semibold hover:underline">Edit</a>
                  <button (click)="remove(product)" class="text-red-600 font-semibold hover:underline">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        </div>
      }
    </div>
  `,
})
export class AdminProducts {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private bannerService = inject(BannerService);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  categoryId: number | null = null;
  search = '';
  bestSellerOnly = signal(false);

  banners = signal<Banner[]>([]);
  bannerError = signal('');
  maxBanners = MAX_BANNERS;
  pendingBanner = signal<{ file: File; previewUrl: string } | null>(null);
  pendingCaption = '';
  addingBanner = signal(false);

  autoBestSellerEnabled = signal(false);
  savingBestSellerSettings = signal(false);

  constructor() {
    this.categoryService.list().subscribe((categories) => this.categories.set(categories));
    this.load();
    this.loadBanners();
    this.productService.getBestSellerSettings().subscribe((res) => this.autoBestSellerEnabled.set(res.auto_enabled));
  }

  toggleAutoBestSeller() {
    const next = !this.autoBestSellerEnabled();
    this.savingBestSellerSettings.set(true);
    this.productService.updateBestSellerSettings(next).subscribe({
      next: (res) => {
        this.autoBestSellerEnabled.set(res.auto_enabled);
        this.savingBestSellerSettings.set(false);
      },
      error: () => this.savingBestSellerSettings.set(false),
    });
  }

  private loadBanners() {
    this.bannerService.adminList().subscribe((banners) => this.banners.set(banners));
  }

  onBannerFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.bannerError.set('');
    this.pendingCaption = '';
    this.pendingBanner.set({ file, previewUrl: URL.createObjectURL(file) });
  }

  cancelPendingBanner() {
    const pending = this.pendingBanner();
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    this.pendingBanner.set(null);
    this.pendingCaption = '';
  }

  confirmAddBanner() {
    const pending = this.pendingBanner();
    if (!pending) return;

    this.addingBanner.set(true);
    this.bannerError.set('');

    const formData = new FormData();
    formData.append('image', pending.file);
    if (this.pendingCaption.trim()) formData.append('caption', this.pendingCaption.trim());

    this.bannerService.adminCreate(formData).subscribe({
      next: () => {
        URL.revokeObjectURL(pending.previewUrl);
        this.pendingBanner.set(null);
        this.pendingCaption = '';
        this.addingBanner.set(false);
        this.loadBanners();
      },
      error: (err) => {
        this.addingBanner.set(false);
        this.bannerError.set(err?.error?.message || 'Could not add this banner.');
      },
    });
  }

  updateCaption(banner: Banner, event: Event) {
    const caption = (event.target as HTMLInputElement).value;
    const formData = new FormData();
    formData.append('caption', caption);

    this.bannerService.adminUpdate(banner.id, formData).subscribe({
      next: (updated) => this.banners.update((banners) => banners.map((b) => (b.id === banner.id ? updated : b))),
      error: (err) => this.bannerError.set(err?.error?.message || 'Could not update this caption.'),
    });
  }

  removeBanner(banner: Banner) {
    if (!confirm('Remove this banner?')) return;
    this.bannerService.adminDelete(banner.id).subscribe(() => this.loadBanners());
  }

  resetFilters() {
    this.search = '';
    this.categoryId = null;
    this.bestSellerOnly.set(false);
    this.load();
  }

  toggleBestSellerFilter() {
    this.bestSellerOnly.update((v) => !v);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.productService.adminList(this.categoryId ?? undefined, this.search || undefined, this.bestSellerOnly()).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remove(product: Product) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    this.productService.adminDelete(product.id).subscribe(() => this.load());
  }
}
