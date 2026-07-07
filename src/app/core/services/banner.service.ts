import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Banner } from '../models';

@Injectable({ providedIn: 'root' })
export class BannerService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/banners`;
  private adminBase = `${environment.apiUrl}/admin/banners`;

  list() {
    return this.http.get<Banner[]>(this.base);
  }

  adminList() {
    return this.http.get<Banner[]>(this.adminBase);
  }

  adminCreate(payload: FormData) {
    return this.http.post<Banner>(this.adminBase, payload);
  }

  adminUpdate(id: number, payload: FormData) {
    return this.http.post<Banner>(`${this.adminBase}/${id}`, payload);
  }

  adminDelete(id: number) {
    return this.http.delete(`${this.adminBase}/${id}`);
  }
}
