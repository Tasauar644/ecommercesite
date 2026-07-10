import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <header class="sticky top-0 z-30 bg-white border-b border-line">
      <div class="w-[92%] max-w-[2200px] mx-auto flex items-center gap-6 h-[72px]">
        <a routerLink="/" class="flex items-center gap-2.5 shrink-0">
          <span class="h-9 w-9 rounded-[10px] bg-brand-600 text-white flex items-center justify-center font-serif font-semibold text-sm">DN</span>
          <span class="font-serif font-semibold text-xl text-ink whitespace-nowrap">Dream N Decor</span>
        </a>

        <form class="flex-1 max-w-md hidden sm:flex items-center gap-2.5 bg-cream border border-line rounded-full pl-4 pr-1.5 py-1.5" (submit)="onSearch($event)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-sub shrink-0"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M20 20L16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input
            [(ngModel)]="searchTerm"
            name="search"
            type="search"
            placeholder="Search products..."
            class="w-full bg-transparent outline-none text-sm text-ink"
          />
          <button type="submit" class="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-full px-4 py-1.5 transition">
            Search
          </button>
        </form>

        <nav class="ml-auto flex items-center gap-5 text-sm font-medium text-ink">
          <button type="button" (click)="mobileSearchOpen.set(!mobileSearchOpen())" class="sm:hidden text-ink" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M20 20L16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          @if (auth.isCustomer()) {
            <a routerLink="/orders" routerLinkActive="text-brand-600" class="hover:text-brand-600">My Orders</a>
          } @else if (!auth.isLoggedIn()) {
            <a routerLink="/track-order" routerLinkActive="text-brand-600" class="hover:text-brand-600">Track Order</a>
          }
          @if (auth.isEmployee() || auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="text-brand-600" class="hover:text-brand-600">Admin</a>
          }

          @if (!auth.isEmployee() && !auth.isAdmin()) {
            <a routerLink="/cart" class="relative hover:text-brand-600" aria-label="Cart">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-[21px] w-[21px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.436m0 0L7.5 14.25a2.25 2.25 0 0 0 2.25 1.5h7.5a2.25 2.25 0 0 0 2.25-1.875l1.02-6.375H5.106m-.001 0L4.5 5.271m3 15.729a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              @if (cart.count() > 0) {
                <span class="absolute -top-2 -right-3 bg-brand-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {{ cart.count() }}
                </span>
              }
            </a>
          }

          @if (auth.isLoggedIn()) {
            <span class="text-sub hidden md:inline">Hi, {{ auth.currentUser()?.name }}</span>
            <button (click)="logout()" class="text-sub hover:text-brand-600">Logout</button>
          } @else {
            <a routerLink="/login" class="hover:text-brand-600">Login</a>
            <a routerLink="/register" class="bg-brand-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-brand-700 transition">Sign up</a>
          }
        </nav>
      </div>

      @if (mobileSearchOpen()) {
        <div class="sm:hidden w-[92%] max-w-[2200px] mx-auto pb-3">
          <form class="flex items-center gap-2.5 bg-cream border border-line rounded-full pl-4 pr-1.5 py-1.5" (submit)="onMobileSearch($event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-sub shrink-0"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M20 20L16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <input
              [(ngModel)]="searchTerm"
              name="mobileSearch"
              type="search"
              placeholder="Search products..."
              autofocus
              class="w-full bg-transparent outline-none text-sm text-ink"
            />
            <button type="submit" class="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-full px-4 py-1.5 transition">
              Search
            </button>
          </form>
        </div>
      }
    </header>
  `,
})
export class Navbar {
  auth = inject(AuthService);
  cart = inject(CartService);
  private router = inject(Router);

  searchTerm = signal('');
  mobileSearchOpen = signal(false);

  onSearch(event: Event) {
    event.preventDefault();
    this.router.navigate(['/products'], { queryParams: { search: this.searchTerm() || null } });
  }

  onMobileSearch(event: Event) {
    this.onSearch(event);
    this.mobileSearchOpen.set(false);
  }

  logout() {
    // Logging out from a storefront page (this navbar only shows outside /admin)
    // should just clear the session and stay put, not redirect anywhere.
    this.auth.logout().subscribe();
  }
}
