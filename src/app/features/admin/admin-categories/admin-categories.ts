import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models';
import { Loader } from '../../../shared/loader/loader';

@Component({
  selector: 'app-admin-categories',
  imports: [FormsModule, Loader],
  template: `
    <div class="bg-white border border-line rounded-2xl p-7">
      <h2 class="font-serif font-semibold text-xl text-ink mb-4">Categories</h2>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
      }

      <form (ngSubmit)="add()" class="flex gap-2.5 mb-3">
        <input
          [(ngModel)]="newName"
          name="newName"
          placeholder="New category name"
          required
          class="flex-1 rounded-full border border-line bg-cream/40 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full px-6 transition">Add</button>
      </form>

      <input
        [ngModel]="search()"
        (ngModelChange)="search.set($event)"
        name="categorySearch"
        placeholder="Search categories..."
        class="w-full rounded-full border border-line px-4 py-2.5 mb-5 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      @if (loading()) {
        <app-loader [fullscreen]="false" />
      } @else if (filteredCategories().length === 0) {
        <p class="text-sub text-sm">No categories match.</p>
      } @else {
        <ul class="divide-y divide-line">
          @for (category of filteredCategories(); track category.id) {
            <li class="flex items-center justify-between py-3 text-sm gap-3">
              @if (editingId() === category.id) {
                <input
                  [(ngModel)]="editName"
                  [name]="'edit-' + category.id"
                  class="flex-1 rounded-lg border border-line px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div class="flex gap-3 shrink-0">
                  <button (click)="saveEdit(category)" class="text-brand-600 font-semibold hover:underline">Save</button>
                  <button (click)="cancelEdit()" class="text-sub hover:underline">Cancel</button>
                </div>
              } @else {
                <span class="text-ink">{{ category.name }}</span>
                <div class="flex gap-4 shrink-0">
                  <button (click)="startEdit(category)" class="text-brand-600 font-semibold hover:underline">Edit</button>
                  <button (click)="remove(category)" class="text-red-600 font-semibold hover:underline">Delete</button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class AdminCategories {
  private categoryService = inject(CategoryService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  error = signal('');
  newName = '';
  search = signal('');

  filteredCategories = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.categories();
    return this.categories().filter((c) => c.name.toLowerCase().includes(term));
  });

  editingId = signal<number | null>(null);
  editName = '';

  constructor() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  add() {
    this.error.set('');
    if (!this.newName.trim()) return;

    this.categoryService.create(this.newName.trim()).subscribe({
      next: () => {
        this.newName = '';
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'Could not add category.'),
    });
  }

  startEdit(category: Category) {
    this.error.set('');
    this.editingId.set(category.id);
    this.editName = category.name;
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editName = '';
  }

  saveEdit(category: Category) {
    this.error.set('');
    if (!this.editName.trim()) return;

    this.categoryService.update(category.id, this.editName.trim()).subscribe({
      next: () => {
        this.editingId.set(null);
        this.editName = '';
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'Could not update category.'),
    });
  }

  remove(category: Category) {
    if (!confirm(`Delete category "${category.name}"? Products in it will become uncategorized.`)) return;
    this.categoryService.delete(category.id).subscribe(() => this.load());
  }
}
