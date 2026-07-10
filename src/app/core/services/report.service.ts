import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { OrderStatus } from '../models';

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: number | null;
  name: string | null;
  image_url: string | null;
  units_sold: number;
  revenue: number;
}

export interface ReportsData {
  revenue: { today: number; week: number; month: number; all_time: number };
  order_counts: Record<OrderStatus, number>;
  total_orders: number;
  avg_order_value: number;
  sales_over_time: SalesPoint[];
  top_products: TopProduct[];
}

export interface CategorySales {
  id: number;
  name: string;
  units_sold: number;
  revenue: number;
  percent: number;
}

export interface ReportProduct {
  id: number | null;
  name: string | null;
  category_id: number;
  category: string;
  units_sold: number;
  unit_price: number;
  total: number;
}

export interface ProductsReport {
  products: ReportProduct[];
  total_units_sold: number;
  total_revenue: number;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);

  index(range: 7 | 30 | 90) {
    return this.http.get<ReportsData>(`${environment.apiUrl}/admin/reports`, { params: { range: String(range) } });
  }

  categories(range: 7 | 30 | 90) {
    return this.http.get<{ categories: CategorySales[] }>(`${environment.apiUrl}/admin/reports/categories`, { params: { range: String(range) } });
  }

  products(range: 7 | 30 | 90) {
    return this.http.get<ProductsReport>(`${environment.apiUrl}/admin/reports/products`, { params: { range: String(range) } });
  }
}
