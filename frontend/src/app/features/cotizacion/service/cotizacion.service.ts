import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import { CotizacionDto } from '../../../core/interfaces/cotizacion.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class CotizacionService {
  apiUrl = `${environment.apiUrl}/cotizaciones`;

  constructor(private http: HttpClient) {}

  getAll(clienteId?: number, estado?: string): Observable<CotizacionDto[]> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (estado) params.push(`estado=${estado}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<CotizacionDto[]>>(url).pipe(map((response) => response.data));
  }

  getById(id: number): Observable<CotizacionDto> {
    return this.http
      .get<ApiResponse<CotizacionDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(cotizacion: Partial<CotizacionDto>): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(this.apiUrl, cotizacion)
      .pipe(map((response) => response));
  }

  update(id: number, cotizacion: Partial<CotizacionDto>): Observable<any> {
    return this.http
      .patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, cotizacion)
      .pipe(map((response) => response));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response));
  }

  getByCliente(clienteId: number): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/cliente/${clienteId}`)
      .pipe(map((response) => response));
  }
}
