import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DeliveryZone, DistrictService } from '../../../core/services/district.service';
import { PaymentSettingService } from '../../../core/services/payment-setting.service';
import { Loader } from '../../../shared/loader/loader';

@Component({
  selector: 'app-admin-delivery',
  imports: [CurrencyPipe, FormsModule, Loader],
  template: `
    <div class="bg-white border border-line rounded-2xl p-6">
      <h2 class="font-serif font-semibold text-lg text-ink mb-1">Delivery Charges</h2>
      <p class="text-sm text-sub mb-4">Set the delivery charge customers pay at checkout, based on whether they're inside or outside Dhaka.</p>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
      }

      @if (loading()) {
        <app-loader [fullscreen]="false" [compact]="true" />
      } @else {
        <ul class="divide-y divide-line">
          @for (z of zones(); track z.zone) {
            <li class="flex items-center justify-between py-3 text-sm gap-3">
              <span class="text-ink font-medium">{{ z.label }}</span>
              @if (editingZone() === z.zone) {
                <div class="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    [(ngModel)]="editCharge"
                    [name]="'edit-' + z.zone"
                    class="w-24 rounded-lg border border-line px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button (click)="save(z)" [disabled]="saving()" class="text-brand-600 hover:underline disabled:opacity-60">Save</button>
                  <button (click)="cancelEdit()" class="text-sub hover:underline">Cancel</button>
                </div>
              } @else {
                <div class="flex items-center gap-3 shrink-0">
                  <span class="text-ink font-medium">{{ +z.delivery_charge | currency:'BDT':'symbol':'1.0-0' }}</span>
                  <button (click)="startEdit(z)" class="text-brand-600 hover:underline">Edit</button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>

    @if (auth.isSuperAdmin()) {
      <div class="bg-white border border-line rounded-2xl p-6 mt-6">
        <h2 class="font-serif font-semibold text-lg text-ink mb-1">Payment Settings</h2>
        <p class="text-sm text-sub mb-4">The bKash number customers are told to send payment to at checkout. Only superadmins can change this.</p>

        @if (paymentError()) {
          <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ paymentError() }}</div>
        }
        @if (paymentSaved()) {
          <div class="mb-4 rounded-lg bg-[#E3F3E7] text-[#2F7A4F] text-sm px-3 py-2">bKash number updated.</div>
        }

        @if (loadingPayment()) {
          <app-loader [fullscreen]="false" [compact]="true" />
        } @else {
          <div class="flex items-center gap-3">
            <input
              [(ngModel)]="bkashNumber"
              name="bkashNumber"
              placeholder="e.g. 01712345678"
              class="flex-1 rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              (click)="saveBkashNumber()"
              [disabled]="savingPayment()"
              class="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
            >
              {{ savingPayment() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class AdminDelivery {
  auth = inject(AuthService);
  private districtService = inject(DistrictService);
  private paymentSettingService = inject(PaymentSettingService);

  zones = signal<DeliveryZone[]>([]);
  loading = signal(true);
  error = signal('');

  editingZone = signal<'dhaka' | 'outside' | null>(null);
  editCharge: number | null = null;
  saving = signal(false);

  bkashNumber = '';
  loadingPayment = signal(true);
  savingPayment = signal(false);
  paymentError = signal('');
  paymentSaved = signal(false);

  constructor() {
    this.load();
    if (this.auth.isSuperAdmin()) {
      this.loadPaymentSettings();
    }
  }

  private load() {
    this.loading.set(true);
    this.districtService.zones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPaymentSettings() {
    this.loadingPayment.set(true);
    this.paymentSettingService.adminGet().subscribe({
      next: (settings) => {
        this.bkashNumber = settings.bkash_number ?? '';
        this.loadingPayment.set(false);
      },
      error: () => this.loadingPayment.set(false),
    });
  }

  saveBkashNumber() {
    this.paymentError.set('');
    this.paymentSaved.set(false);
    this.savingPayment.set(true);

    this.paymentSettingService.adminUpdate(this.bkashNumber.trim()).subscribe({
      next: () => {
        this.savingPayment.set(false);
        this.paymentSaved.set(true);
      },
      error: (err) => {
        this.savingPayment.set(false);
        this.paymentError.set(err?.error?.message || 'Could not update the bKash number.');
      },
    });
  }

  startEdit(zone: DeliveryZone) {
    this.error.set('');
    this.editingZone.set(zone.zone);
    this.editCharge = +zone.delivery_charge;
  }

  cancelEdit() {
    this.editingZone.set(null);
    this.editCharge = null;
  }

  save(zone: DeliveryZone) {
    this.error.set('');
    if (this.editCharge === null || this.editCharge < 0) return;

    this.saving.set(true);
    this.districtService.updateZone(zone.zone, this.editCharge).subscribe({
      next: (updated) => {
        this.zones.update((zones) => zones.map((z) => (z.zone === zone.zone ? { ...z, delivery_charge: updated.delivery_charge } : z)));
        this.saving.set(false);
        this.editingZone.set(null);
        this.editCharge = null;
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Could not update delivery charge.');
      },
    });
  }
}
