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

  track(phone: string, orderId?: number) {
    return this.http.post<Order[]>(`${this.base}/track-order`, { order_id: orderId, phone });
  }

  adminOrders(search?: string, checkoutType?: 'guest' | 'account') {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (checkoutType) params['checkout_type'] = checkoutType;
    return this.http.get<Paginated<Order>>(`${this.base}/admin/orders`, { params });
  }

  updateAdminStatus(id: number, status: OrderStatus) {
    return this.http.patch<Order>(`${this.base}/admin/orders/${id}/status`, { status });
  }

  updateAdmin(id: number, payload: UpdateOrderPayload) {
    return this.http.patch<Order>(`${this.base}/admin/orders/${id}`, payload);
  }
}

export interface UpdateOrderPayload {
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  district_id?: number;
  delivery_charge?: number;
  items?: { id: number; quantity: number; unit_price: number }[];
  remove_item_ids?: number[];
  new_items?: { product_id: number; quantity: number; unit_price: number }[];
}
