import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import { VentaDto } from '../../../core/interfaces/venta.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  apiUrl = `${environment.apiUrl}/ventas`;

  constructor(private http: HttpClient) {}

  getAll(clienteId?: number, asesorId?: number): Observable<VentaDto[]> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (asesorId) params.push(`asesorId=${asesorId}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<VentaDto[]>>(url).pipe(map((response) => response.data));
  }

  getById(id: number): Observable<VentaDto> {
    return this.http
      .get<ApiResponse<VentaDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(venta: Partial<VentaDto>): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, venta).pipe(map((response) => response));
  }

  update(id: number, venta: Partial<VentaDto>): Observable<any> {
    return this.http
      .patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, venta)
      .pipe(map((response) => response));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response));
  }
}
