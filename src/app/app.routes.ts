import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/products/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/products/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'staff/login',
    loadComponent: () => import('./features/auth/staff-login/staff-login').then((m) => m.StaffLogin),
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart-page/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/my-orders/my-orders').then((m) => m.MyOrders),
  },
  {
    path: 'track-order',
    loadComponent: () => import('./features/orders/track-order/track-order').then((m) => m.TrackOrder),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin', 'superadmin', 'employee')],
    loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/products/new',
    canActivate: [roleGuard('admin', 'superadmin', 'employee')],
    loadComponent: () => import('./features/seller/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'admin/products/:id/edit',
    canActivate: [roleGuard('admin', 'superadmin', 'employee')],
    loadComponent: () => import('./features/seller/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
