import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { StaffTopbar } from './shared/staff-topbar/staff-topbar';
import { ChatWidget } from './shared/chat-widget/chat-widget';

const STAFF_LOGIN_ROUTE = '/staff/login';
const ADMIN_ROUTE_PREFIX = '/admin';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, StaffTopbar, ChatWidget],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  auth = inject(AuthService);

  private currentPath = signal(this.router.url.split('?')[0]);

  private isStaffLoginRoute = computed(() => this.currentPath() === STAFF_LOGIN_ROUTE);
  private isAdminRoute = computed(() => this.currentPath().startsWith(ADMIN_ROUTE_PREFIX));
  // The dashboard itself has its own built-in sidebar (with branding/logout), so it
  // needs no extra chrome; other /admin pages (e.g. the product form) still get the topbar.
  private isAdminDashboardRoute = computed(() => this.currentPath() === ADMIN_ROUTE_PREFIX);

  showStaffBar = computed(() => this.isAdminRoute() && !this.isAdminDashboardRoute());
  showChrome = computed(() => !this.isStaffLoginRoute() && !this.isAdminRoute());

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: NavigationEnd) => {
      this.currentPath.set(e.urlAfterRedirects.split('?')[0]);
    });
  }
}
