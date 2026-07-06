import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-staff-login',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6" style="background: linear-gradient(135deg, #FAF5EF 0%, #F7E4D8 50%, #FBEEE8 100%)">
      <div class="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">
        <div
          class="hidden md:flex flex-col justify-between p-9 text-white"
          style="background-image: repeating-linear-gradient(135deg, #B5583A, #B5583A 12px, #9C4A2F 12px, #9C4A2F 24px)"
        >
          <div class="flex items-center gap-2.5">
            <span class="h-9 w-9 rounded-[10px] bg-white/15 border border-white/30 flex items-center justify-center font-serif font-semibold text-sm">DN</span>
            <span class="font-serif font-semibold text-lg">Dream N Decor</span>
          </div>

          <h2 class="font-serif font-bold text-3xl leading-snug">Welcome back to the studio.</h2>

          <div>
            <p class="text-sm text-white/85 mb-6">Sign in to manage products, orders and customers behind the scenes.</p>
            <div class="flex gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-white/40"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-white/40"></span>
              <span class="h-1.5 w-6 rounded-full bg-white"></span>
            </div>
          </div>
        </div>

        <div class="p-8 sm:p-10">
          <span class="text-xs font-bold text-brand-600 uppercase tracking-wide">Staff access</span>
          <h1 class="font-serif font-semibold text-2xl text-ink mt-1">Staff login</h1>
          <p class="text-sm text-sub mb-6">For employees, admins, and superadmins only.</p>

          @if (error()) {
            <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
          }

          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-ink mb-1">Username</label>
              <input
                [(ngModel)]="username"
                name="username"
                type="text"
                required
                placeholder="Enter username"
                class="w-full rounded-lg border border-line bg-cream px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink mb-1">Password</label>
              <input
                [(ngModel)]="password"
                name="password"
                type="password"
                required
                class="w-full rounded-lg border border-line bg-cream px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-full py-2.5 transition"
            >
              {{ loading() ? 'Logging in...' : 'Log in' }}
            </button>
          </form>

          <p class="text-center text-xs text-sub mt-6 leading-relaxed">
            Need access? Contact your admin at<br />
            <a href="mailto:admin@dreamndecor.com" class="text-brand-700 font-semibold">admin&#64;dreamndecor.com</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class StaffLogin {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.error.set('');
    this.loading.set(true);

    this.auth.staffLogin({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigateByUrl('/admin');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Invalid username or password.');
      },
    });
  }
}
