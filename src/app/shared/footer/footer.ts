import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="bg-ink text-[#D8CFC4]">
      <div class="w-[92%] max-w-[2200px] mx-auto py-3.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="h-6 w-6 rounded-md bg-brand-600 text-white flex items-center justify-center font-serif font-semibold text-[10px] shrink-0">DN</span>
          <span class="font-serif font-semibold text-sm text-white">Dream N Decor</span>
        </div>

        <nav class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <a routerLink="/products" class="hover:text-white">All products</a>
          <a href="mailto:hello@dreamndecor.com" class="hover:text-white">Contact</a>
          <a [routerLink]="auth.isLoggedIn() ? '/orders' : '/track-order'" class="hover:text-white">Track order</a>
        </nav>

        <div class="flex items-center gap-3">
          <div class="flex gap-1.5">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener"
              aria-label="Facebook"
              class="h-6 w-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center opacity-95 hover:opacity-100 transition"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 8.5H17V5.5H15C13.067 5.5 11.5 7.067 11.5 9V11H9.5V14H11.5V19H14.5V14H16.5L17 11H14.5V9C14.5 8.724 14.724 8.5 15 8.5Z" fill="currentColor"/></svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
              class="h-6 w-6 rounded-full text-white flex items-center justify-center opacity-95 hover:opacity-100 transition"
              style="background: linear-gradient(135deg, #FEDA75 0%, #D62976 55%, #4F5BD5 100%)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.6" stroke="currentColor" stroke-width="1.8"/><circle cx="16.7" cy="7.3" r="1.1" fill="currentColor"/></svg>
            </a>
          </div>
          <span class="text-[11px] text-[#9C907F] whitespace-nowrap">&copy; {{ year }} Dream N Decor</span>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  auth = inject(AuthService);
  year = new Date().getFullYear();
}
