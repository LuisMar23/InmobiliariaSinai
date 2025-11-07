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

    return this.http.get<ApiResponse<CotizacionDto[]>>(url).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  getById(id: number): Observable<CotizacionDto> {
    return this.http.get<ApiResponse<CotizacionDto>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Error al obtener la cotización');
      })
    );
  }

  create(cotizacion: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, cotizacion).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al crear la cotización');
      })
    );
  }

  update(id: number, cotizacion: any): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, cotizacion).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al actualizar la cotización');
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al eliminar la cotización');
      })
    );
  }

  // CORREGIDO: Este endpoint no existe en el backend, lo removemos o ajustamos
  // getByCliente(clienteId: number): Observable<any> {
  //   return this.http.get<ApiResponse<any>>(`${this.apiUrl}/cliente/${clienteId}`).pipe(
  //     map((response) => {
  //       if (response.success) {
  //         return response;
  //       }
  //       throw new Error(response.message || 'Error al obtener cotizaciones del cliente');
  //     })
  //   );
  // }
}
