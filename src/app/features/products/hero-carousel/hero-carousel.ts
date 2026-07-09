import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { BannerService } from '../../../core/services/banner.service';
import { Banner } from '../../../core/models';

const AUTO_ADVANCE_MS = 6000;

@Component({
  selector: 'app-hero-carousel',
  template: `
    @if (currentBanner(); as banner) {
      <div class="relative rounded-2xl overflow-hidden h-56 sm:h-72 lg:h-80 xl:h-96 bg-cream">
        <img [src]="banner.image_url" [alt]="banner.caption || 'Banner'" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent"></div>

        @if (banner.caption) {
          <p class="absolute left-6 bottom-6 right-6 text-white font-serif font-semibold text-xl sm:text-2xl max-w-md">{{ banner.caption }}</p>
        }

        @if (banners().length > 1) {
          <button
            type="button"
            (click)="prev()"
            aria-label="Previous banner"
            class="absolute left-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-ink flex items-center justify-center hover:bg-white transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button
            type="button"
            (click)="next()"
            aria-label="Next banner"
            class="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-ink flex items-center justify-center hover:bg-white transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            @for (b of banners(); track b.id; let i = $index) {
              <button
                type="button"
                (click)="goTo(i)"
                [attr.aria-label]="'Go to banner ' + (i + 1)"
                class="h-1.5 rounded-full transition-all"
                [class]="i === currentIndex() ? 'w-6 bg-brand-600' : 'w-1.5 bg-white/70'"
              ></button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class HeroCarousel implements OnDestroy {
  private bannerService = inject(BannerService);

  banners = signal<Banner[]>([]);
  currentIndex = signal(0);
  currentBanner = computed(() => this.banners()[this.currentIndex()] ?? null);

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.bannerService.list().subscribe((banners) => {
      this.banners.set(banners);
      this.restartAutoAdvance();
    });
  }

  prev() {
    this.goTo((this.currentIndex() - 1 + this.banners().length) % this.banners().length);
  }

  next() {
    this.goTo((this.currentIndex() + 1) % this.banners().length);
  }

  goTo(index: number) {
    this.currentIndex.set(index);
    this.restartAutoAdvance();
  }

  private restartAutoAdvance() {
    if (this.timer) clearInterval(this.timer);
    if (this.banners().length > 1) {
      this.timer = setInterval(() => this.next(), AUTO_ADVANCE_MS);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
