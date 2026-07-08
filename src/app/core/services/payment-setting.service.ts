import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface PaymentSettings {
  bkash_number: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentSettingService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get() {
    return this.http.get<PaymentSettings>(`${this.base}/payment-settings`);
  }

  adminGet() {
    return this.http.get<PaymentSettings>(`${this.base}/admin/payment-settings`);
  }

  adminUpdate(bkashNumber: string) {
    return this.http.post<PaymentSettings>(`${this.base}/admin/payment-settings`, { bkash_number: bkashNumber || null });
  }
}
