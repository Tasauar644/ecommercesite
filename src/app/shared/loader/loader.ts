import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  template: `
    <div
      class="flex items-center justify-center bg-cream loader-fade-in"
      [class]="fullscreen ? 'fixed inset-0 z-50' : 'py-16'"
    >
      <div class="flex flex-col items-center" [class]="compact ? 'gap-3' : 'gap-[22px]'">
        <div class="relative" [class]="compact ? 'h-10 w-10' : 'h-[72px] w-[72px]'">
          <svg [attr.width]="compact ? 40 : 72" [attr.height]="compact ? 40 : 72" viewBox="0 0 80 80" class="loader-spin">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#EBE1D5" stroke-width="5" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#B5583A"
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="226"
              class="loader-dash"
            />
          </svg>
          <span
            class="absolute top-1/2 left-1/2 rounded-[11px] bg-brand-600 text-white flex items-center justify-center font-serif font-semibold loader-pulse"
            [class]="compact ? 'h-[22px] w-[22px] text-[9px] rounded-[6px]' : 'h-10 w-10 text-[15px]'"
          >
            DN
          </span>
        </div>

        @if (!compact) {
          <div class="flex flex-col items-center gap-2.5">
            <span class="font-serif font-semibold text-lg text-ink tracking-[0.01em]">Dream N Decor</span>
            <div class="flex gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-brand-600 loader-dot" style="animation-delay: 0s"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-brand-600 loader-dot" style="animation-delay: 0.15s"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-brand-600 loader-dot" style="animation-delay: 0.3s"></span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @keyframes loader-fade-in-kf {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .loader-fade-in {
      animation: loader-fade-in-kf 0.4s ease;
    }

    @keyframes loader-spin-kf {
      to { transform: rotate(360deg); }
    }
    .loader-spin {
      animation: loader-spin-kf 1.4s linear infinite;
    }

    @keyframes loader-dash-kf {
      0% { stroke-dashoffset: 226; }
      50% { stroke-dashoffset: 56; }
      100% { stroke-dashoffset: 226; }
    }
    .loader-dash {
      animation: loader-dash-kf 1.4s ease-in-out infinite;
    }

    @keyframes loader-pulse-kf {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.08); }
    }
    .loader-pulse {
      animation: loader-pulse-kf 1.4s ease-in-out infinite;
    }

    @keyframes loader-dot-bounce-kf {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
      40% { transform: translateY(-6px); opacity: 1; }
    }
    .loader-dot {
      animation: loader-dot-bounce-kf 1.2s ease-in-out infinite;
    }
  `,
})
export class Loader {
  // fixed full-viewport overlay (route-level pages) vs. a normal-flow block
  // that just centers within whatever container it's dropped into (admin
  // dashboard tabs, side panels) — the sidebar/shell around it stays visible.
  @Input() fullscreen = true;
  // scaled-down ring + logo, no wordmark — for tight spaces (side panels,
  // small cards) where the full brand lockup would overwhelm the content.
  @Input() compact = false;
}
