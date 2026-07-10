import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Paginated, Product } from '../models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/products`;
  private adminBase = `${environment.apiUrl}/admin/products`;

  list(search?: string, categoryId?: number | number[], page?: number, minPrice?: number, maxPrice?: number) {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (categoryId !== undefined) {
      const ids = Array.isArray(categoryId) ? categoryId : [categoryId];
      if (ids.length) params['category_id'] = ids.join(',');
    }
    if (page) params['page'] = String(page);
    if (minPrice !== undefined) params['min_price'] = String(minPrice);
    if (maxPrice !== undefined) params['max_price'] = String(maxPrice);
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

  getBestSellerSettings() {
    return this.http.get<{ auto_enabled: boolean }>(`${environment.apiUrl}/admin/best-seller-settings`);
  }

  updateBestSellerSettings(autoEnabled: boolean) {
    return this.http.post<{ auto_enabled: boolean }>(`${environment.apiUrl}/admin/best-seller-settings`, { auto_enabled: autoEnabled });
  }
}
