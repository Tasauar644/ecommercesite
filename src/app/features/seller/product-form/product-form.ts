import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { Category, ProductImage } from '../../../core/models';

const MAX_IMAGES = 3;

@Component({
  selector: 'app-product-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-8">
      <a routerLink="/admin" [queryParams]="{ tab: 'products' }" class="text-sm font-semibold text-brand-700 hover:text-brand-600">&larr; Back to dashboard</a>

      <div class="bg-white border border-line rounded-2xl p-8 mt-4 shadow-[0_4px_16px_rgba(46,38,32,0.05)]">
        <span class="text-xs font-bold text-brand-700 uppercase tracking-wide">Inventory</span>
        <h1 class="font-serif font-semibold text-2xl text-ink mt-1">{{ productId ? 'Edit product' : 'Add a new product' }}</h1>
        <p class="text-sm text-sub mt-1.5 mb-6">
          {{ productId ? 'Update the details below — changes are reflected in the storefront immediately.' : 'Fill in the details below — this will appear in the storefront once saved.' }}
        </p>

        @if (error()) {
          <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
        }
        @if (loading()) {
          <p class="text-sub">Loading...</p>
        } @else {
          <form (ngSubmit)="submit()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-ink mb-1.5">Name</label>
              <input
                [(ngModel)]="name"
                name="name"
                required
                placeholder="e.g. Floral Bed Sheet Set"
                class="w-full rounded-lg border border-line px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink mb-1.5">Description</label>
              <textarea
                [(ngModel)]="description"
                name="description"
                rows="4"
                required
                placeholder="A short, appealing description customers will see on the product page."
                class="w-full rounded-lg border border-line px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-ink mb-1.5">Category</label>
              <div class="relative">
                <select
                  [(ngModel)]="categoryId"
                  name="categoryId"
                  required
                  class="w-full appearance-none rounded-lg border border-line px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option [ngValue]="null" disabled>Select a category</option>
                  @for (category of categories(); track category.id) {
                    <option [ngValue]="category.id">{{ category.name }}</option>
                  }
                </select>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sub">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-ink mb-1.5">Price</label>
                <div class="flex rounded-lg border border-line overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                  <span class="flex items-center bg-cream px-3 text-sm font-medium text-sub border-r border-line">BDT</span>
                  <input
                    [(ngModel)]="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="w-full px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-ink mb-1.5">Quantity</label>
                <input [(ngModel)]="quantity" name="quantity" type="number" min="0" required class="w-full rounded-lg border border-line px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink mb-1.5">
                Product photos <span class="text-sub font-normal">({{ maxImages === 1 ? '1' : '1 to ' + maxImages }})</span>
              </label>
              <div class="grid grid-cols-3 gap-3">
                @for (img of visibleExistingImages(); track img.id) {
                  <div class="relative aspect-square rounded-lg overflow-hidden border border-line">
                    <img [src]="img.url" alt="Product photo" class="w-full h-full object-cover" />
                    <button
                      type="button"
                      (click)="removeExisting(img.id)"
                      class="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
                @for (img of newImages(); track img.previewUrl; let i = $index) {
                  <div class="relative aspect-square rounded-lg overflow-hidden border border-line">
                    <img [src]="img.previewUrl" alt="New photo" class="w-full h-full object-cover" />
                    <button
                      type="button"
                      (click)="removeNew(i)"
                      class="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
                @if (totalImageCount() < maxImages) {
                  <label
                    for="productImages"
                    class="aspect-square flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-line rounded-lg cursor-pointer bg-cream/40 hover:border-brand-400 hover:bg-brand-50/40 transition"
                  >
                    <span class="h-6 w-6 flex items-center justify-center text-brand-600 text-xl leading-none">+</span>
                    <span class="text-xs text-brand-700 font-semibold">Add photo</span>
                  </label>
                }
              </div>
              @if (imageError()) {
                <p class="text-xs text-red-600 mt-1">{{ imageError() }}</p>
              }
              <input id="productImages" type="file" accept="image/*" multiple (change)="onFilesSelected($event)" class="hidden" />
            </div>

            <button
              type="submit"
              [disabled]="saving()"
              class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl py-3.5 transition"
            >
              {{ saving() ? 'Saving...' : (productId ? 'Save changes' : 'Add product') }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ProductForm {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  maxImages = MAX_IMAGES;

  productId: number | null = null;

  name = '';
  description = '';
  price: number | null = null;
  quantity: number | null = null;
  categoryId: number | null = null;
  categories = signal<Category[]>([]);

  existingImages = signal<ProductImage[]>([]);
  removedImageIds = signal<number[]>([]);
  newImages = signal<{ file: File; previewUrl: string }[]>([]);
  imageError = signal('');

  visibleExistingImages = computed(() => this.existingImages().filter((img) => !this.removedImageIds().includes(img.id)));
  totalImageCount = computed(() => this.visibleExistingImages().length + this.newImages().length);

  loading = signal(false);
  saving = signal(false);
  error = signal('');

  constructor() {
    this.categoryService.list().subscribe((categories) => this.categories.set(categories));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.productId = Number(idParam);
      this.loading.set(true);
      this.productService.get(this.productId).subscribe({
        next: (product) => {
          this.name = product.name;
          this.description = product.description ?? '';
          this.price = Number(product.price);
          this.quantity = product.quantity;
          this.categoryId = product.category_id;
          this.existingImages.set(product.images ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const availableSlots = this.maxImages - this.totalImageCount();

    const toAdd = files.slice(0, availableSlots).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    this.newImages.update((imgs) => [...imgs, ...toAdd]);
    input.value = '';
  }

  removeExisting(id: number) {
    this.removedImageIds.update((ids) => [...ids, id]);
  }

  removeNew(index: number) {
    this.newImages.update((imgs) => {
      URL.revokeObjectURL(imgs[index].previewUrl);
      return imgs.filter((_, i) => i !== index);
    });
  }

  submit() {
    this.error.set('');
    this.imageError.set('');

    if (this.totalImageCount() < 1) {
      this.imageError.set('A product needs at least one photo.');
      return;
    }

    this.saving.set(true);

    const formData = new FormData();
    formData.append('name', this.name);
    formData.append('description', this.description ?? '');
    formData.append('price', String(this.price));
    formData.append('quantity', String(this.quantity));
    formData.append('category_id', String(this.categoryId));
    this.newImages().forEach((img) => formData.append('images[]', img.file));
    this.removedImageIds().forEach((id) => formData.append('remove_image_ids[]', String(id)));

    const request = this.productId
      ? this.productService.adminUpdate(this.productId, formData)
      : this.productService.adminCreate(formData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/admin'], { queryParams: { tab: 'products' } });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Could not save this product.');
      },
    });
  }
}
