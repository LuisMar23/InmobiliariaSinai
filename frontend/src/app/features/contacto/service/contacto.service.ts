import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import {
  ContactoDto,
  CreateContactoDto,
  UpdateContactoDto,
} from '../../../core/interfaces/contacto.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ContactoService {
  private apiUrl = `${environment.apiUrl}/contactos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ContactoDto[]> {
    return this.http
      .get<ApiResponse<ContactoDto[]>>(this.apiUrl)
      .pipe(
        map((res) =>
          res.success && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [],
        ),
      );
  }

  getById(id: number): Observable<ContactoDto> {
    return this.http.get<ApiResponse<ContactoDto>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        if (res.success) return res.data;
        throw new Error(res.message);
      }),
    );
  }

  create(data: CreateContactoDto): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }

  update(id: number, data: UpdateContactoDto): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }
}
