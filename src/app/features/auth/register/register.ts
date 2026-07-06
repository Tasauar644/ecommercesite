import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto mt-16 px-4">
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p class="text-sm text-gray-500 mb-6">Sign up to shop and track your orders.</p>

        @if (error()) {
          <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
        }

        <form (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              [(ngModel)]="name"
              name="name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              [(ngModel)]="username"
              name="username"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              [(ngModel)]="phone"
              name="phone"
              type="tel"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email <span class="text-gray-400 font-normal">(optional)</span></label>
            <input
              [(ngModel)]="email"
              name="email"
              type="email"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              [(ngModel)]="password"
              name="password"
              type="password"
              required
              minlength="8"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition"
          >
            {{ loading() ? 'Creating account...' : 'Sign up' }}
          </button>
        </form>

        <p class="text-sm text-gray-500 mt-6 text-center">
          Already have an account? <a routerLink="/login" class="text-brand-600 font-medium hover:underline">Log in</a>
        </p>
      </div>
    </div>
  `,
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  username = '';
  phone = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.error.set('');
    this.loading.set(true);

    this.auth
      .register({
        name: this.name,
        username: this.username,
        phone: this.phone,
        email: this.email || undefined,
        password: this.password,
      })
      .subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Could not create your account.');
        },
      });
  }
}
