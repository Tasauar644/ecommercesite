import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-my-account-modal',
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="close()">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-900 mb-4">My Account</h2>

          @if (error()) {
            <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
          }

          <form (ngSubmit)="save()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input [(ngModel)]="username" name="username" required class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input [value]="auth.currentUser()?.phone" disabled class="w-full rounded-lg border border-gray-300 bg-gray-100 text-gray-500 px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email <span class="text-gray-400 font-normal">(optional)</span></label>
              <input [(ngModel)]="email" name="email" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">New password <span class="text-gray-400 font-normal">(leave blank to keep current)</span></label>
              <input [(ngModel)]="password" name="password" type="password" minlength="8" class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              @if (password) {
                <p class="text-xs text-gray-400 mt-1">Changing your password will log you out everywhere.</p>
              }
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Status</span>
              <span class="text-sm text-gray-500">{{ auth.currentUser()?.is_active ? 'Active' : 'Inactive' }}</span>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" (click)="close()" class="flex-1 border border-gray-300 text-gray-700 font-medium rounded-lg py-2.5 transition hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition"
              >
                {{ saving() ? 'Saving...' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class MyAccountModal {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  isOpen = signal(false);
  username = '';
  email = '';
  password = '';
  error = signal('');
  saving = signal(false);

  open() {
    const user = this.auth.currentUser();
    this.username = user?.username ?? '';
    this.email = user?.email ?? '';
    this.password = '';
    this.error.set('');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  save() {
    this.error.set('');
    this.saving.set(true);

    const passwordChanged = !!this.password;
    const payload: Record<string, string> = { username: this.username, email: this.email || '' };
    if (passwordChanged) {
      payload['password'] = this.password;
    }

    this.http.patch<User>(`${environment.apiUrl}/profile`, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.isOpen.set(false);

        if (passwordChanged) {
          this.auth.logout().subscribe(() => this.router.navigateByUrl('/staff/login'));
        } else {
          this.auth.updateCurrentUser(updated);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Could not save changes.');
      },
    });
  }
}
