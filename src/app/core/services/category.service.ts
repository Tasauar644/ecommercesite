import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list() {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  create(name: string) {
    return this.http.post<Category>(`${this.base}/admin/categories`, { name });
  }

  update(id: number, name: string) {
    return this.http.put<Category>(`${this.base}/admin/categories/${id}`, { name });
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/admin/categories/${id}`);
  }
}
