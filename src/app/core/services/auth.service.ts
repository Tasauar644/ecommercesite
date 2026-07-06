import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Permission, Role, User } from '../models';
import { CartService } from './cart.service';

interface AuthResponse {
  user: User;
  token: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private cart = inject(CartService);

  private storedUser = sessionStorage.getItem(USER_KEY);
  currentUser = signal<User | null>(this.storedUser ? JSON.parse(this.storedUser) : null);

  isLoggedIn = computed(() => !!this.currentUser());
  role = computed<Role | null>(() => this.currentUser()?.role ?? null);
  isSuperAdmin = computed(() => this.role() === 'superadmin');
  isAdmin = computed(() => this.role() === 'admin' || this.isSuperAdmin());
  isEmployee = computed(() => this.role() === 'employee');
  isCustomer = computed(() => this.role() === 'customer');

  hasPermission(permission: Permission): boolean {
    // Admins and superadmins have full access by default; only 'employee' accounts are permission-scoped.
    return this.isAdmin() || !!this.currentUser()?.permissions?.includes(permission);
  }

  get token(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  updateCurrentUser(user: User) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  register(payload: { name: string; username: string; phone: string; email?: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/register`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  login(payload: { username: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/login`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  staffLogin(payload: { username: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/staff-login`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  logout() {
    // Always clear the local session, even if the server call fails (e.g. an
    // already-expired/invalid token) — the user's intent is to be logged out locally.
    return this.http.post(`${environment.apiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession())
    );
  }

  private persistSession(res: AuthResponse) {
    sessionStorage.setItem(TOKEN_KEY, res.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    // The cart belongs to whoever is logged in — logging out shouldn't leave it
    // sitting there for the next guest/customer to stumble onto.
    this.cart.clear();
  }
}
