import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Paginated, Product } from '../models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/products`;
  private adminBase = `${environment.apiUrl}/admin/products`;

  list(search?: string, categoryId?: number, page?: number) {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (categoryId) params['category_id'] = String(categoryId);
    if (page) params['page'] = String(page);
    return this.http.get<Paginated<Product>>(this.base, { params });
  }

  get(id: number) {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  adminList(categoryId?: number, search?: string) {
    const params: Record<string, string> = {};
    if (categoryId) params['category_id'] = String(categoryId);
    if (search) params['search'] = search;
    return this.http.get<Paginated<Product>>(this.adminBase, { params });
  }

  adminCreate(payload: FormData) {
    return this.http.post<Product>(this.adminBase, payload);
  }

  adminUpdate(id: number, payload: FormData) {
    return this.http.post<Product>(`${this.adminBase}/${id}`, payload);
  }

  adminDelete(id: number) {
    return this.http.delete(`${this.adminBase}/${id}`);
  }
}
