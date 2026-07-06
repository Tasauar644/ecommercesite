import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Paginated, Permission, User } from '../models';

export interface CreateEmployeePayload {
  name: string;
  username: string;
  phone: string;
  email?: string;
  password: string;
  role: 'employee' | 'admin' | 'superadmin';
  permissions: Permission[];
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/employees`;

  list() {
    return this.http.get<Paginated<User>>(this.base);
  }

  create(payload: CreateEmployeePayload) {
    return this.http.post<User>(this.base, payload);
  }

  update(id: number, payload: { role?: 'admin' | 'superadmin'; permissions?: Permission[] }) {
    return this.http.patch<User>(`${this.base}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
