import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ReservaDto } from '../../../core/interfaces/reserva.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class ReservaService {
  apiUrl = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) {}

  getAll(clienteId?: number, estado?: string): Observable<ReservaDto[]> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (estado) params.push(`estado=${estado}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<ReservaDto[]>>(url).pipe(
      map((response) => {
        console.log('Respuesta de la API:', response);
        return response.data;
      })
    );
  }

  getById(id: number): Observable<ReservaDto> {
    return this.http
      .get<ApiResponse<ReservaDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(reserva: Partial<ReservaDto>): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, reserva).pipe(map((response) => response));
  }

  update(id: number, reserva: Partial<ReservaDto>): Observable<any> {
    return this.http
      .patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, reserva)
      .pipe(map((response) => response));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response));
  }
}
