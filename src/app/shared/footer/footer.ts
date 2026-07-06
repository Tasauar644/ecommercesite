import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="bg-ink text-[#D8CFC4] mt-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-10 py-14 grid grid-cols-1 sm:grid-cols-[minmax(240px,1.6fr)_repeat(3,1fr)] gap-10">
        <div class="flex flex-col gap-4 sm:pr-5">
          <div class="flex items-center gap-2.5">
            <span class="h-[34px] w-[34px] rounded-[9px] bg-brand-600 text-white flex items-center justify-center font-serif font-semibold text-sm shrink-0">DN</span>
            <span class="font-serif font-semibold text-lg text-white">Dream N Decor</span>
          </div>
          <p class="text-sm leading-relaxed text-[#B8AC9E] max-w-[320px] m-0">
            Handcrafted home &amp; decor essentials, made to bring warmth to every room.
          </p>
          <div class="flex gap-3 items-center">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener"
              aria-label="Facebook"
              class="h-[34px] w-[34px] rounded-full bg-[#1877F2] text-white flex items-center justify-center opacity-95 hover:opacity-100 hover:-translate-y-0.5 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 8.5H17V5.5H15C13.067 5.5 11.5 7.067 11.5 9V11H9.5V14H11.5V19H14.5V14H16.5L17 11H14.5V9C14.5 8.724 14.724 8.5 15 8.5Z" fill="currentColor"/></svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
              class="h-[34px] w-[34px] rounded-full text-white flex items-center justify-center opacity-95 hover:opacity-100 hover:-translate-y-0.5 transition"
              style="background: linear-gradient(135deg, #FEDA75 0%, #D62976 55%, #4F5BD5 100%)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.6" stroke="currentColor" stroke-width="1.8"/><circle cx="16.7" cy="7.3" r="1.1" fill="currentColor"/></svg>
            </a>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="font-sans text-xs font-bold text-white uppercase tracking-wide m-0">Shop</h4>
          <a routerLink="/products" class="text-sm text-[#B8AC9E] hover:text-white">All products</a>
          <a [routerLink]="['/products']" [queryParams]="{ search: 'Teabag' }" class="text-sm text-[#B8AC9E] hover:text-white">Teabag sachets</a>
          <a [routerLink]="['/products']" [queryParams]="{ search: 'Beverage' }" class="text-sm text-[#B8AC9E] hover:text-white">Beverage dispensers</a>
          <a [routerLink]="['/products']" [queryParams]="{ search: 'Bed' }" class="text-sm text-[#B8AC9E] hover:text-white">Bed sheets</a>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="font-sans text-xs font-bold text-white uppercase tracking-wide m-0">Support</h4>
          <a href="mailto:hello@dreamndecor.com" class="text-sm text-[#B8AC9E] hover:text-white">Contact us</a>
          <span class="text-sm text-[#B8AC9E]">Shipping &amp; returns</span>
          <span class="text-sm text-[#B8AC9E]">FAQs</span>
          <a routerLink="/orders" class="text-sm text-[#B8AC9E] hover:text-white">Track order</a>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="font-sans text-xs font-bold text-white uppercase tracking-wide m-0">Get in touch</h4>
          <span class="text-sm text-[#B8AC9E]">hello&#64;dreamndecor.com</span>
          <span class="text-sm text-[#B8AC9E]">+880 1XXX-XXXXXX</span>
          <span class="text-sm text-[#B8AC9E]">Dhaka, Bangladesh</span>
        </div>
      </div>

      <div class="border-t border-[#453A30]">
        <div class="max-w-6xl mx-auto px-4 sm:px-10 py-5">
          <span class="text-[13px] text-[#9C907F]">&copy; {{ year }} Dream N Decor. All rights reserved.</span>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  year = new Date().getFullYear();
}
