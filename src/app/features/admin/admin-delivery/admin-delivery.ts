import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryZone, DistrictService } from '../../../core/services/district.service';

@Component({
  selector: 'app-admin-delivery',
  imports: [CurrencyPipe, FormsModule],
  template: `
    <div class="bg-white border border-line rounded-2xl p-6">
      <h2 class="font-serif font-semibold text-lg text-ink mb-1">Delivery Charges</h2>
      <p class="text-sm text-sub mb-4">Set the delivery charge customers pay at checkout, based on whether they're inside or outside Dhaka.</p>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="text-sub text-sm">Loading...</p>
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
  `,
})
export class AdminDelivery {
  private districtService = inject(DistrictService);

  zones = signal<DeliveryZone[]>([]);
  loading = signal(true);
  error = signal('');

  editingZone = signal<'dhaka' | 'outside' | null>(null);
  editCharge: number | null = null;
  saving = signal(false);

  constructor() {
    this.load();
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
