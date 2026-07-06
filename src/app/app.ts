import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { StaffTopbar } from './shared/staff-topbar/staff-topbar';

const STAFF_LOGIN_ROUTE = '/staff/login';
const ADMIN_ROUTE_PREFIX = '/admin';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, StaffTopbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  auth = inject(AuthService);

  private currentPath = signal(this.router.url.split('?')[0]);

  private isStaffLoginRoute = computed(() => this.currentPath() === STAFF_LOGIN_ROUTE);
  // Only the admin dashboard itself gets the minimal staff topbar; every other page
  // (including the storefront) shows the normal navbar, even while logged in as staff.
  private isAdminRoute = computed(() => this.currentPath().startsWith(ADMIN_ROUTE_PREFIX));

  showStaffBar = computed(() => this.isAdminRoute());
  showChrome = computed(() => !this.isStaffLoginRoute() && !this.isAdminRoute());

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: NavigationEnd) => {
      this.currentPath.set(e.urlAfterRedirects.split('?')[0]);
    });
  }
}
