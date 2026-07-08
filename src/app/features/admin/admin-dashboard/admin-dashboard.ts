import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { OrderService } from '../../../core/services/order.service';
import { ALL_PERMISSIONS, Order, OrderStatus, Paginated, Permission, Role, User } from '../../../core/models';
import { AdminCategories } from '../admin-categories/admin-categories';
import { AdminCustomers } from '../admin-customers/admin-customers';
import { AdminDelivery } from '../admin-delivery/admin-delivery';
import { AdminProducts } from '../admin-products/admin-products';

type Tab = 'orders' | 'users' | 'products' | 'categories' | 'customers' | 'delivery';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CurrencyPipe, DatePipe, FormsModule, AdminProducts, AdminCategories, AdminCustomers, AdminDelivery],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-9">
      <div class="mb-6">
        <span class="text-xs font-bold text-brand-700 uppercase tracking-wide">Control center</span>
        <h1 class="font-serif font-semibold text-3xl text-ink mt-1.5">
          {{ auth.isSuperAdmin() ? 'Super Admin Dashboard' : auth.isEmployee() ? 'Employee Dashboard' : 'Admin Dashboard' }}
        </h1>
      </div>

      <div class="flex flex-wrap gap-2.5 mb-6">
        @for (t of visibleTabs(); track t.id) {
          <button
            (click)="tab.set(t.id)"
            class="px-5 py-2.5 rounded-full text-sm font-semibold transition"
            [class]="tab() === t.id ? 'bg-brand-600 text-white shadow-[0_8px_18px_rgba(181,88,58,0.28)]' : 'bg-white border border-line text-ink'"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @if (visibleTabs().length === 0) {
        <p class="text-sub">You don't have any admin permissions assigned yet.</p>
      }

      @if (tab() === 'orders' && canSee('orders')) {
        <form (ngSubmit)="searchOrders()" class="flex gap-3 mb-7">
          <input
            [(ngModel)]="orderSearch"
            name="orderSearch"
            placeholder="Search by name, order #, or address"
            class="flex-1 rounded-xl border-[1.5px] border-line px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl px-6 shadow-[0_8px_18px_rgba(181,88,58,0.28)] transition">Search</button>
        </form>

        @if (loadingOrders()) {
          <p class="text-sub">Loading orders...</p>
        } @else if (orders().length === 0) {
          <p class="text-sub">No orders yet.</p>
        } @else {
          <div class="space-y-5">
            @for (order of orders(); track order.id) {
              <div class="bg-white border border-line rounded-[18px] px-6 py-5 shadow-[0_4px_16px_rgba(46,38,32,0.05)]">
                <div class="flex items-start justify-between flex-wrap gap-3 pb-4.5 border-b border-line mb-4.5">
                  <div>
                    <p class="font-serif font-semibold text-lg text-ink">Order #{{ order.id }}</p>
                    <p class="text-[12.5px] text-sub">
                      {{ order.created_at | date: 'medium' }} &middot;
                      {{ order.customer ? 'Account: ' + order.customer.name : 'Guest checkout' }}
                    </p>
                  </div>
                  <select
                    [ngModel]="order.status"
                    (ngModelChange)="updateStatus(order, $event)"
                    class="text-[13px] font-bold rounded-full border-0 pl-4 pr-8 py-1.5 capitalize focus:outline-none focus:ring-2 focus:ring-brand-500"
                    [class]="statusClasses(order.status)"
                  >
                    <option value="pending">pending</option>
                    <option value="processing">processing</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>

                <div class="grid sm:grid-cols-4 gap-4.5 pb-4.5 border-b border-line">
                  <div class="flex flex-col gap-1">
                    <p class="text-[11px] font-bold text-sub uppercase tracking-wide">Name</p>
                    <p class="text-sm font-semibold text-ink">{{ order.shipping_name }}</p>
                  </div>
                  <div class="flex flex-col gap-1">
                    <p class="text-[11px] font-bold text-sub uppercase tracking-wide">Phone</p>
                    <p class="text-sm font-semibold text-ink">{{ order.shipping_phone }}</p>
                  </div>
                  <div class="flex flex-col gap-1">
                    <p class="text-[11px] font-bold text-sub uppercase tracking-wide">District</p>
                    <p class="text-sm font-semibold text-ink">{{ order.district?.name || '—' }}</p>
                  </div>
                  <div class="flex flex-col gap-1">
                    <p class="text-[11px] font-bold text-sub uppercase tracking-wide">Address</p>
                    <p class="text-sm font-semibold text-ink">{{ order.shipping_address }}</p>
                  </div>
                </div>

                <div>
                  @for (item of order.items; track item.id) {
                    <div class="flex items-center gap-3.5 py-4 border-b border-line">
                      <div class="h-[52px] w-[52px] rounded-[10px] bg-cream overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-line">
                        @if (item.product?.image_url || item.product_image) {
                          <img [src]="item.product?.image_url || item.product_image" [alt]="item.product?.name || item.product_name || ''" class="h-full w-full object-cover" />
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-line" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 12V4.5A2.25 2.25 0 0 1 5.25 2.25h13.5A2.25 2.25 0 0 1 21 4.5V12m-18 0v7.5A2.25 2.25 0 0 0 5.25 21.75h13.5A2.25 2.25 0 0 0 21 19.5V12m-18 0h18M8.25 8.25h.008v.008H8.25V8.25Z" />
                          </svg>
                        }
                      </div>
                      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                        <p class="text-[14.5px] font-semibold text-ink truncate">
                          {{ item.product?.name || item.product_name || 'Product removed' }}
                          @if (item.variant_color_name) { <span class="text-sub font-normal">({{ item.variant_color_name }})</span> }
                        </p>
                        <p class="text-[12.5px] text-sub">Qty {{ item.quantity }} &times; {{ item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</p>
                      </div>
                      <span class="font-serif text-[15px] font-bold text-ink shrink-0">{{ item.quantity * +item.unit_price | currency:'BDT':'symbol':'1.0-0' }}</span>
                    </div>
                  }
                </div>

                <div class="flex justify-between pt-3.5">
                  <span class="text-[13.5px] font-semibold text-brand-700">Delivery charge{{ order.district?.name ? ' (' + order.district!.name + ')' : '' }}</span>
                  <span class="text-[13.5px] font-semibold text-sub">{{ order.delivery_charge | currency:'BDT':'symbol':'1.0-0' }}</span>
                </div>
                <div class="flex justify-between mt-1.5">
                  <span class="text-[15px] font-extrabold text-ink">Total</span>
                  <span class="font-serif text-[17px] font-extrabold text-ink">{{ order.total | currency:'BDT':'symbol':'1.0-0' }}</span>
                </div>
                <div class="flex justify-between mt-1.5 text-[12.5px] text-sub">
                  <span>Payment</span>
                  <span>
                    {{ order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery' }}
                    @if (order.payment_transaction_id) { &middot; TrxID {{ order.payment_transaction_id }} }
                  </span>
                </div>
              </div>
            }
          </div>
        }
      }

      @if (tab() === 'users' && canSee('users')) {
        <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div class="flex items-center gap-3 flex-wrap">
            <div class="inline-flex rounded-full border border-line p-1">
              @for (segment of userSegments; track segment.value) {
                <button
                  (click)="userStatusFilter.set(segment.value)"
                  class="px-3 py-1 rounded-full text-sm font-medium transition"
                  [class]="userStatusFilter() === segment.value ? 'bg-brand-600 text-white' : 'text-sub'"
                >
                  {{ segment.label }}
                </button>
              }
            </div>
            <input
              [ngModel]="userSearch()"
              (ngModelChange)="userSearch.set($event)"
              name="userSearch"
              placeholder="Search by name, phone, or email"
              class="rounded-full border border-line px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          @if (auth.isSuperAdmin()) {
            <button (click)="openAddEmployee()" class="bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-full px-4 py-1.5 text-sm transition">
              + Add Staff
            </button>
          }
        </div>

        @if (usersError()) {
          <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ usersError() }}</div>
        }

        @if (loadingUsers()) {
          <p class="text-sub">Loading users...</p>
        } @else if (filteredUsers().length === 0) {
          <p class="text-sub">No users in this filter.</p>
        } @else {
          <div class="bg-white border border-line rounded-2xl overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-cream text-sub text-left">
                <tr>
                  <th class="px-4 py-3 font-medium">Name</th>
                  <th class="px-4 py-3 font-medium">Phone</th>
                  <th class="px-4 py-3 font-medium">Email</th>
                  <th class="px-4 py-3 font-medium">Role</th>
                  <th class="px-4 py-3 font-medium">Joined</th>
                  <th class="px-4 py-3 font-medium">Status</th>
                  <th class="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (u of filteredUsers(); track u.id) {
                  <tr>
                    <td class="px-4 py-3 font-medium text-ink">
                      <div class="flex items-center gap-2.5">
                        <span class="h-8 w-8 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-serif font-semibold text-xs">
                          @if (u.avatar_url) {
                            <img [src]="u.avatar_url" [alt]="u.name" class="h-full w-full object-cover" />
                          } @else {
                            {{ initials(u.name) }}
                          }
                        </span>
                        {{ u.name }}
                      </div>
                    </td>
                    <td class="px-4 py-3">{{ u.phone }}</td>
                    <td class="px-4 py-3">{{ u.email }}</td>
                    <td class="px-4 py-3 capitalize">{{ u.role }}</td>
                    <td class="px-4 py-3">{{ u.created_at | date: 'mediumDate' }}</td>
                    <td class="px-4 py-3">
                      <button
                        (click)="toggleUserActive(u)"
                        [disabled]="u.id === auth.currentUser()?.id || !canManageTarget(u)"
                        [attr.aria-label]="u.is_active ? 'Deactivate ' + u.name : 'Activate ' + u.name"
                        [title]="u.id === auth.currentUser()?.id ? 'You can\\'t deactivate your own account' : !canManageTarget(u) ? 'Only superadmins can manage admin accounts' : (u.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate')"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed"
                        [class]="u.is_active ? 'bg-brand-600' : 'bg-gray-300'"
                      >
                        <span
                          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
                          [class]="u.is_active ? 'translate-x-6' : 'translate-x-1'"
                        ></span>
                      </button>
                    </td>
                    <td class="px-4 py-3 text-right space-x-3">
                      @if (canManageTarget(u)) {
                        <button (click)="openEdit(u)" class="text-brand-600 hover:underline">Edit</button>
                      } @else {
                        <span class="text-sub text-sm">View only</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      @if (editingUser(); as editing) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="closeEdit()">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
            <h2 class="font-serif text-lg font-semibold text-ink mb-4">Edit {{ editing.name }}</h2>

              @if (editError()) {
                <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ editError() }}</div>
              }

              <form (ngSubmit)="saveEdit(editing)" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-ink mb-1">Photo <span class="text-sub font-normal">(optional)</span></label>
                  <div class="flex items-center gap-3">
                    <span class="h-14 w-14 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-serif font-semibold">
                      @if (editAvatarPreview()) {
                        <img [src]="editAvatarPreview()" alt="Avatar preview" class="h-full w-full object-cover" />
                      } @else if (!editRemoveAvatar() && editing.avatar_url) {
                        <img [src]="editing.avatar_url" alt="Avatar" class="h-full w-full object-cover" />
                      } @else {
                        {{ initials(editing.name) }}
                      }
                    </span>
                    <div class="flex flex-col gap-1">
                      <label for="editAvatarInput" class="text-sm text-brand-600 font-medium hover:underline cursor-pointer w-fit">
                        {{ editAvatarPreview() || (!editRemoveAvatar() && editing.avatar_url) ? 'Change photo' : 'Add photo' }}
                      </label>
                      @if (editAvatarPreview() || (!editRemoveAvatar() && editing.avatar_url)) {
                        <button type="button" (click)="removeEditAvatar()" class="text-xs text-red-600 hover:underline text-left w-fit">Remove photo</button>
                      }
                    </div>
                  </div>
                  <input id="editAvatarInput" type="file" accept="image/*" (change)="onEditAvatarSelected($event)" class="hidden" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-ink mb-1">Username</label>
                  <input [value]="editing.username" disabled class="w-full rounded-lg border border-line bg-cream text-sub px-3 py-2" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-ink mb-1">Name</label>
                  <input [(ngModel)]="editName" name="editName" required class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-ink mb-1">Phone</label>
                  <input [(ngModel)]="editPhone" name="editPhone" required class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-ink mb-1">Email <span class="text-sub font-normal">(optional)</span></label>
                  <input [(ngModel)]="editEmail" name="editEmail" type="email" class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-ink mb-1">Role</label>
                  <select
                    [(ngModel)]="editRole"
                    name="editRole"
                    [disabled]="editing.id === auth.currentUser()?.id || !auth.isSuperAdmin()"
                    class="w-full rounded-lg border border-line px-3 py-2 disabled:bg-cream disabled:text-sub"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                  @if (editing.id === auth.currentUser()?.id) {
                    <p class="text-xs text-sub mt-1">You can't change your own role.</p>
                  } @else if (!auth.isSuperAdmin()) {
                    <p class="text-xs text-sub mt-1">Only superadmins can change roles.</p>
                  }
                </div>

                @if (editRole === 'admin') {
                  <p class="text-xs text-sub">Admins have full access to every section automatically.</p>
                } @else if (editRole === 'employee') {
                  <div>
                    <label class="block text-sm font-medium text-ink mb-2">Permissions</label>
                    @if (editing.id === auth.currentUser()?.id) {
                      <p class="text-xs text-sub mb-2">You can't change your own permissions.</p>
                    }
                    <div class="space-y-2">
                      @for (perm of allPermissions; track perm.value) {
                        <label class="flex items-center gap-2 text-sm text-ink" [class.opacity-50]="editing.id === auth.currentUser()?.id">
                          <input
                            type="checkbox"
                            [checked]="editPermissions().includes(perm.value)"
                            [disabled]="editing.id === auth.currentUser()?.id"
                            (change)="toggleEditPermission(perm.value)"
                          />
                          {{ perm.label }}
                        </label>
                      }
                    </div>
                  </div>
                }

                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-ink">Status</span>
                  <button
                    type="button"
                    (click)="editIsActive.set(!editIsActive())"
                    [disabled]="editing.id === auth.currentUser()?.id"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed"
                    [class]="editIsActive() ? 'bg-brand-600' : 'bg-gray-300'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition"
                      [class]="editIsActive() ? 'translate-x-6' : 'translate-x-1'"
                    ></span>
                  </button>
                </div>

                @if (auth.isSuperAdmin() && editing.id !== auth.currentUser()?.id) {
                  <div class="border-t border-line pt-4">
                    @if (resetPasswordMessage()) {
                      <p class="text-sm text-green-600 mb-2">{{ resetPasswordMessage() }}</p>
                    }
                    <button
                      type="button"
                      (click)="resetPassword(editing)"
                      [disabled]="resettingPassword()"
                      class="text-sm text-red-600 hover:underline disabled:opacity-60"
                    >
                      {{ resettingPassword() ? 'Resetting...' : 'Reset password to default (12345678)' }}
                    </button>
                  </div>
                }

                <div class="flex gap-3 pt-2">
                  <button type="button" (click)="closeEdit()" class="flex-1 border border-line text-ink font-medium rounded-lg py-2.5 transition hover:bg-cream">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="savingEdit()"
                    class="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition"
                  >
                    {{ savingEdit() ? 'Saving...' : 'Save changes' }}
                  </button>
                </div>
              </form>
          </div>
        </div>
      }

      @if (addingEmployee()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="closeAddEmployee()">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
            <h2 class="font-serif text-lg font-semibold text-ink mb-4">Add Staff</h2>

            @if (addEmployeeError()) {
              <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ addEmployeeError() }}</div>
            }

            <form (ngSubmit)="submitAddEmployee()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-ink mb-1">Name</label>
                <input [(ngModel)]="newEmployeeName" name="newEmployeeName" required class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-ink mb-1">Username</label>
                <input [(ngModel)]="newEmployeeUsername" name="newEmployeeUsername" required class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-ink mb-1">Phone</label>
                <input [(ngModel)]="newEmployeePhone" name="newEmployeePhone" type="tel" required class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-ink mb-1">Email <span class="text-sub font-normal">(optional)</span></label>
                <input [(ngModel)]="newEmployeeEmail" name="newEmployeeEmail" type="email" class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-ink mb-1">Password</label>
                <input [(ngModel)]="newEmployeePassword" name="newEmployeePassword" type="password" required minlength="8" class="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-ink mb-1">Role</label>
                <select [(ngModel)]="newEmployeeRole" name="newEmployeeRole" class="w-full rounded-lg border border-line px-3 py-2">
                  <option value="employee">Employee (scoped permissions)</option>
                  <option value="admin">Admin (full access)</option>
                  <option value="superadmin">Super Admin (full access)</option>
                </select>
                @if (newEmployeeRole === 'admin' || newEmployeeRole === 'superadmin') {
                  <p class="text-xs text-sub mt-1">Admins and superadmins have full access to every section automatically.</p>
                }
              </div>

              @if (newEmployeeRole === 'employee') {
                <div>
                  <label class="block text-sm font-medium text-ink mb-2">Permissions</label>
                  <div class="space-y-2">
                    @for (perm of allPermissions; track perm.value) {
                      <label class="flex items-center gap-2 text-sm text-ink">
                        <input type="checkbox" [checked]="newEmployeePermissions().includes(perm.value)" (change)="toggleNewEmployeePermission(perm.value)" />
                        {{ perm.label }}
                      </label>
                    }
                  </div>
                </div>
              }

              <div class="flex gap-3 pt-2">
                <button type="button" (click)="closeAddEmployee()" class="flex-1 border border-line text-ink font-medium rounded-lg py-2.5 transition hover:bg-cream">
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="savingNewEmployee()"
                  class="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition"
                >
                  {{ savingNewEmployee() ? 'Adding...' : 'Add Staff' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (tab() === 'products' && canSee('products')) {
        <app-admin-products />
      }

      @if (tab() === 'categories' && canSee('categories')) {
        <app-admin-categories />
      }

      @if (tab() === 'customers' && canSee('customers')) {
        <app-admin-customers />
      }

      @if (tab() === 'delivery' && canSee('delivery')) {
        <app-admin-delivery />
      }
    </div>
  `,
})
export class AdminDashboard {
  auth = inject(AuthService);
  private orderService = inject(OrderService);
  private employeeService = inject(EmployeeService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private allTabs: { id: Tab; label: string }[] = [
    { id: 'orders', label: 'Orders' },
    { id: 'users', label: 'Users' },
    { id: 'products', label: 'Products' },
    { id: 'categories', label: 'Categories' },
    { id: 'customers', label: 'Customers' },
    { id: 'delivery', label: 'Delivery' },
  ];

  visibleTabs = computed(() => this.allTabs.filter((t) => this.canSee(t.id)));

  tab = signal<Tab>('orders');

  orders = signal<Order[]>([]);
  loadingOrders = signal(true);
  orderSearch = '';

  users = signal<User[]>([]);
  loadingUsers = signal(true);
  usersError = signal('');
  userStatusFilter = signal<'all' | 'active' | 'inactive'>('active');
  userSearch = signal('');
  userSegments: { value: 'all' | 'active' | 'inactive'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
  filteredUsers = computed(() => {
    const filter = this.userStatusFilter();
    const term = this.userSearch().trim().toLowerCase();
    let list = this.users();
    if (filter !== 'all') list = list.filter((u) => (filter === 'active' ? u.is_active : !u.is_active));
    if (term) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          (u.phone ?? '').toLowerCase().includes(term) ||
          (u.email ?? '').toLowerCase().includes(term)
      );
    }
    return list;
  });

  editingUser = signal<User | null>(null);
  editName = '';
  editPhone = '';
  editEmail = '';
  editRole: Role = 'employee';
  editPermissions = signal<Permission[]>([]);
  editIsActive = signal(true);
  editError = signal('');
  savingEdit = signal(false);
  allPermissions = ALL_PERMISSIONS;

  editAvatarFile: File | null = null;
  editAvatarPreview = signal<string | null>(null);
  editRemoveAvatar = signal(false);

  resettingPassword = signal(false);
  resetPasswordMessage = signal('');

  addingEmployee = signal(false);
  newEmployeeName = '';
  newEmployeeUsername = '';
  newEmployeePhone = '';
  newEmployeeEmail = '';
  newEmployeePassword = '';
  newEmployeeRole: 'employee' | 'admin' | 'superadmin' = 'employee';
  newEmployeePermissions = signal<Permission[]>([]);
  addEmployeeError = signal('');
  savingNewEmployee = signal(false);

  constructor() {
    if (this.canSee('orders')) {
      this.loadOrders();
    }

    if (this.canSee('users')) {
      this.loadUsers();
    }

    const requestedTab = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (requestedTab && this.canSee(requestedTab)) {
      this.tab.set(requestedTab);
    } else {
      const firstVisible = this.visibleTabs()[0];
      if (firstVisible) this.tab.set(firstVisible.id);
    }
  }

  private loadUsers() {
    this.loadingUsers.set(true);
    this.http.get<Paginated<User>>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  canSee(tab: Tab): boolean {
    // Role-gated, not permission-gated — an employee should never be able to reach the Users tab.
    if (tab === 'users') return this.auth.isAdmin();
    if (tab === 'orders') return this.auth.hasPermission('manage_orders');
    if (tab === 'products') return this.auth.hasPermission('manage_products');
    if (tab === 'categories') return this.auth.hasPermission('manage_categories');
    if (tab === 'customers') return this.auth.hasPermission('manage_customers');
    if (tab === 'delivery') return this.auth.hasPermission('manage_delivery');
    return false;
  }

  // Only superadmins can manage admin/superadmin accounts; anyone with Users access can manage employees, and everyone can manage their own account.
  canManageTarget(u: User): boolean {
    if (u.id === this.auth.currentUser()?.id) return true;
    if (u.role === 'employee') return true;
    return this.auth.isSuperAdmin();
  }

  private loadOrders() {
    this.loadingOrders.set(true);
    this.orderService.adminOrders(this.orderSearch || undefined).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.loadingOrders.set(false);
      },
      error: () => this.loadingOrders.set(false),
    });
  }

  searchOrders() {
    this.loadOrders();
  }

  toggleUserActive(user: User) {
    if (user.id === this.auth.currentUser()?.id) return;

    this.usersError.set('');
    this.http.patch<User>(`${environment.apiUrl}/admin/users/${user.id}`, { is_active: !user.is_active }).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((u) => (u.id === user.id ? { ...u, is_active: updated.is_active } : u)));
      },
      error: (err) => this.usersError.set(err?.error?.message || 'Could not update this user.'),
    });
  }

  openEdit(user: User) {
    this.editingUser.set(user);
    this.editName = user.name;
    this.editPhone = user.phone;
    this.editEmail = user.email ?? '';
    this.editRole = user.role;
    this.editPermissions.set(user.permissions ?? []);
    this.editIsActive.set(!!user.is_active);
    this.editError.set('');
    this.resetPasswordMessage.set('');
    this.editAvatarFile = null;
    this.editAvatarPreview.set(null);
    this.editRemoveAvatar.set(false);
  }

  closeEdit() {
    this.editingUser.set(null);
  }

  initials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  onEditAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.editAvatarFile = file;
    this.editAvatarPreview.set(URL.createObjectURL(file));
    this.editRemoveAvatar.set(false);
    input.value = '';
  }

  removeEditAvatar() {
    this.editAvatarFile = null;
    this.editAvatarPreview.set(null);
    this.editRemoveAvatar.set(true);
  }

  resetPassword(user: User) {
    if (!confirm(`Reset ${user.name}'s password to the default (12345678)? They'll be logged out everywhere.`)) return;

    this.resetPasswordMessage.set('');
    this.resettingPassword.set(true);

    this.http.post(`${environment.apiUrl}/admin/users/${user.id}/reset-password`, {}).subscribe({
      next: () => {
        this.resettingPassword.set(false);
        this.resetPasswordMessage.set('Password reset to 12345678.');
      },
      error: (err) => {
        this.resettingPassword.set(false);
        this.resetPasswordMessage.set(err?.error?.message || 'Could not reset password.');
      },
    });
  }

  toggleEditPermission(perm: Permission) {
    this.editPermissions.update((perms) => (perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm]));
  }

  saveEdit(user: User) {
    this.editError.set('');
    this.savingEdit.set(true);

    const formData = new FormData();
    formData.append('name', this.editName);
    formData.append('phone', this.editPhone);
    formData.append('email', this.editEmail || '');
    formData.append('role', this.editRole);
    formData.append('is_active', this.editIsActive() ? '1' : '0');

    if (this.editRole === 'employee') {
      formData.append('permissions_included', '1');
      this.editPermissions().forEach((perm) => formData.append('permissions[]', perm));
    }

    if (this.editAvatarFile) {
      formData.append('avatar', this.editAvatarFile);
    } else if (this.editRemoveAvatar()) {
      formData.append('remove_avatar', '1');
    }

    this.http
      .post<User>(`${environment.apiUrl}/admin/users/${user.id}`, formData)
      .subscribe({
        next: (updated) => {
          this.users.update((users) => users.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
          this.savingEdit.set(false);
          this.editingUser.set(null);
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.editError.set(err?.error?.message || 'Could not save changes.');
        },
      });
  }

  updateStatus(order: Order, status: OrderStatus) {
    this.orderService.updateAdminStatus(order.id, status).subscribe(() => {
      this.orders.update((orders) => orders.map((o) => (o.id === order.id ? { ...o, status } : o)));
    });
  }

  openAddEmployee() {
    this.newEmployeeName = '';
    this.newEmployeeUsername = '';
    this.newEmployeePhone = '';
    this.newEmployeeEmail = '';
    this.newEmployeePassword = '';
    this.newEmployeeRole = 'employee';
    this.newEmployeePermissions.set([]);
    this.addEmployeeError.set('');
    this.addingEmployee.set(true);
  }

  closeAddEmployee() {
    this.addingEmployee.set(false);
  }

  toggleNewEmployeePermission(perm: Permission) {
    this.newEmployeePermissions.update((perms) => (perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm]));
  }

  submitAddEmployee() {
    this.addEmployeeError.set('');
    this.savingNewEmployee.set(true);

    this.employeeService
      .create({
        name: this.newEmployeeName,
        username: this.newEmployeeUsername,
        phone: this.newEmployeePhone,
        email: this.newEmployeeEmail || undefined,
        password: this.newEmployeePassword,
        role: this.newEmployeeRole,
        permissions: this.newEmployeeRole === 'employee' ? this.newEmployeePermissions() : [],
      })
      .subscribe({
        next: () => {
          this.savingNewEmployee.set(false);
          this.addingEmployee.set(false);
          this.loadUsers();
        },
        error: (err) => {
          this.savingNewEmployee.set(false);
          this.addEmployeeError.set(err?.error?.message || 'Could not create employee.');
        },
      });
  }

  statusClasses(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-[#E3F3E7] text-[#2F7A4F]';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
    }
  }
}
