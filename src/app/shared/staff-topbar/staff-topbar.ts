import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MyAccountModal } from '../my-account-modal/my-account-modal';

@Component({
  selector: 'app-staff-topbar',
  imports: [MyAccountModal, RouterLink],
  template: `
    <header class="bg-white border-b border-line">
      <div class="max-w-6xl mx-auto px-4 flex items-center justify-between h-16 text-sm">
        <a routerLink="/products" class="flex items-center gap-2.5">
          <span class="h-8 w-8 rounded-[9px] bg-brand-600 text-white flex items-center justify-center font-serif font-semibold text-[13px]">DN</span>
          <span class="font-serif font-semibold text-lg text-ink">Dream N Decor</span>
        </a>

        <div class="flex items-center gap-5">
          <button (click)="accountModal.open()" class="text-sub hover:text-brand-600">
            Hi, {{ auth.currentUser()?.name }}
          </button>
          <button (click)="logout()" class="font-semibold text-brand-700 hover:text-brand-600">Logout</button>
        </div>
      </div>
    </header>

    <app-my-account-modal #accountModal />
  `,
})
export class StaffTopbar {
  auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/staff/login'));
  }
}
