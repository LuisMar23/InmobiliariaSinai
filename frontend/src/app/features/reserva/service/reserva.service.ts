import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ReservaDto } from '../../../core/interfaces/reserva.interface';
import { AuthService } from '../../../components/services/auth.service';

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

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAll(clienteId?: number, estado?: string): Observable<ReservaDto[]> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (estado) params.push(`estado=${estado}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<ReservaDto[]>>(url).pipe(
      map((response) => {
        return response.data;
      })
    );
  }

  getById(id: number): Observable<ReservaDto> {
    return this.http
      .get<ApiResponse<ReservaDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(reserva: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, reserva).pipe(map((response) => response));
  }

  update(id: number, reserva: any): Observable<any> {
    return this.http
      .patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, reserva)
      .pipe(map((response) => response));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response));
  }

  // CORREGIDO: Usar el endpoint correcto para cajas abiertas
  getCajasActivas(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/cajas/abiertas`)
      .pipe(map((response) => response));
  }

  // NUEVO: Métodos para recibos de reserva
  subirRecibosReserva(
    reservaId: number,
    files: File[],
    usuarioRegistroId: number
  ): Observable<any> {
    try {
      const formData = new FormData();

      if (!files || !Array.isArray(files)) {
        throw new Error('Archivos inválidos');
      }

      files.forEach((file) => {
        if (file instanceof File) {
          formData.append('files', file);
        }
      });

      formData.append('reservaId', reservaId.toString());
      formData.append('usuarioRegistroId', usuarioRegistroId.toString());

      return this.http
        .post<any>(`${environment.apiUrl}/recibos/reserva/upload`, formData)
        .pipe(map((response) => response));
    } catch (error) {
      console.error('Error preparando datos para subir recibos:', error);
      throw error;
    }
  }

  obtenerRecibosPorReserva(reservaId: number): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/recibos/reserva/${reservaId}`)
      .pipe(map((response) => response));
  }

  eliminarReciboReserva(reciboId: number): Observable<any> {
    return this.http
      .delete<any>(`${environment.apiUrl}/recibos/${reciboId}`)
      .pipe(map((response) => response));
  }
}
