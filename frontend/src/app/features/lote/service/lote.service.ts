import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import { LoteDto } from '../../../core/interfaces/lote.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class LoteService {
  apiUrl = `${environment.apiUrl}/lotes`;

  constructor(private http: HttpClient) {}

  getAll(urbanizacionId?: number): Observable<LoteDto[]> {
    const url = urbanizacionId ? `${this.apiUrl}?urbanizacionId=${urbanizacionId}` : this.apiUrl;
    return this.http.get<ApiResponse<LoteDto[]>>(url).pipe(map((response) => response.data));
  }

  getById(id: number): Observable<LoteDto> {
    return this.http
      .get<ApiResponse<LoteDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(lote: Partial<LoteDto>): Observable<LoteDto> {
    return this.http
      .post<ApiResponse<LoteDto>>(this.apiUrl, lote)
      .pipe(map((response) => response.data));
  }

  update(id: number, lote: Partial<LoteDto>): Observable<LoteDto> {
    return this.http
      .patch<ApiResponse<LoteDto>>(`${this.apiUrl}/${id}`, lote)
      .pipe(map((response) => response.data));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }
}
