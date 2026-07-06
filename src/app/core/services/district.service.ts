import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { District } from '../models';

export interface DeliveryZone {
  zone: 'dhaka' | 'outside';
  label: string;
  delivery_charge: string;
}

@Injectable({ providedIn: 'root' })
export class DistrictService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list() {
    return this.http.get<District[]>(`${this.base}/districts`);
  }

  zones() {
    return this.http.get<DeliveryZone[]>(`${this.base}/admin/delivery-zones`);
  }

  updateZone(zone: 'dhaka' | 'outside', delivery_charge: number) {
    return this.http.patch<DeliveryZone>(`${this.base}/admin/delivery-zones/${zone}`, { delivery_charge });
  }
}
