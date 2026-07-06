import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { Category, Product } from '../../../core/models';

@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
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
            <button type="submit" class="text-sm text-brand-600 font-medium hover:underline">Search</button>
          </form>
          <select [(ngModel)]="categoryId" (ngModelChange)="load()" class="text-sm rounded-full border border-line px-3 py-1.5">
            <option [ngValue]="null">All categories</option>
            @for (category of categories(); track category.id) {
              <option [ngValue]="category.id">{{ category.name }}</option>
            }
          </select>
          <a routerLink="/admin/products/new" class="bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-full px-5 py-2 transition text-sm">
            + Add product
          </a>
        </div>
      </div>

      @if (loading()) {
        <p class="text-sub text-sm p-6">Loading...</p>
      } @else if (products().length === 0) {
        <p class="text-sub text-sm p-6">No products found.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="bg-cream text-left">
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
                </td>
                <td class="px-4 py-4">
                  <span class="text-xs font-semibold text-brand-700 bg-brand-100 rounded-full px-3 py-1 whitespace-nowrap">{{ product.category?.name || 'Uncategorized' }}</span>
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
      }
    </div>
  `,
})
export class AdminProducts {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  categoryId: number | null = null;
  search = '';

  constructor() {
    this.categoryService.list().subscribe((categories) => this.categories.set(categories));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.productService.adminList(this.categoryId ?? undefined, this.search || undefined).subscribe({
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
