import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Product } from '../models';

export interface SmartSearchInterpreted {
  keyword: string | null;
  category: string | null;
  min_price: number | null;
  max_price: number | null;
}

export interface SmartSearchResult {
  products: Product[];
  interpreted: SmartSearchInterpreted;
  ai_used: boolean;
}

@Injectable({ providedIn: 'root' })
export class SmartSearchService {
  private http = inject(HttpClient);

  search(query: string) {
    return this.http.post<SmartSearchResult>(`${environment.apiUrl}/smart-search`, { query });
  }
}
