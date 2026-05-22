import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import {
  ManzanoDto,
  CreateManzanoDto,
  UpdateManzanoDto,
} from '../../../core/interfaces/manzano.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ManzanoService {
  private apiUrl = `${environment.apiUrl}/manzanos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ManzanoDto[]> {
    return this.http
      .get<ApiResponse<ManzanoDto[]>>(this.apiUrl)
      .pipe(
        map((res) =>
          res.success && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [],
        ),
      );
  }

  getById(id: number): Observable<ManzanoDto> {
    return this.http.get<ApiResponse<ManzanoDto>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        if (res.success) return res.data;
        throw new Error(res.message);
      }),
    );
  }

  create(data: CreateManzanoDto): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }

  update(id: number, data: UpdateManzanoDto): Observable<any> {
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
