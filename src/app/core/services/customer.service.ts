import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Customer, Order, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/customers`;

  list(search?: string) {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    return this.http.get<Paginated<Customer>>(this.base, { params });
  }

  show(id: number) {
    return this.http.get<Customer & { orders: Order[] }>(`${this.base}/${id}`);
  }
}
