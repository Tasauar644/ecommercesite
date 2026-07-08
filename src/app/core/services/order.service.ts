import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus, Paginated, PaymentMethod } from '../models';

export interface PlaceOrderPayload {
  shipping_name: string;
  shipping_address: string;
  shipping_phone: string;
  district_id: number;
  payment_method: PaymentMethod;
  payment_transaction_id?: string;
  items: { product_id: number; variant_id?: number; quantity: number }[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  place(payload: PlaceOrderPayload) {
    return this.http.post<Order>(`${this.base}/orders`, payload);
  }

  placeGuest(payload: PlaceOrderPayload) {
    return this.http.post<Order>(`${this.base}/guest-orders`, payload);
  }

  myOrders() {
    return this.http.get<Paginated<Order>>(`${this.base}/orders`);
  }

  adminOrders(search?: string) {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    return this.http.get<Paginated<Order>>(`${this.base}/admin/orders`, { params });
  }

  updateAdminStatus(id: number, status: OrderStatus) {
    return this.http.patch<Order>(`${this.base}/admin/orders/${id}/status`, { status });
  }
}
