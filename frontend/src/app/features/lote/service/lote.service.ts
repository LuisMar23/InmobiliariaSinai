import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import { LoteDto, CreateLoteDto, UpdateLoteDto } from '../../../core/interfaces/lote.interface';

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
    return this.http.get<ApiResponse<LoteDto[]>>(url).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  getAllLotesIndependientes(): Observable<LoteDto[]> {
    return this.http.get<ApiResponse<LoteDto[]>>(`${this.apiUrl}/independientes/todos`).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  getById(id: number): Observable<LoteDto> {
    return this.http.get<ApiResponse<LoteDto>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Error al obtener el lote');
      })
    );
  }

  getLotesParaCotizacion(): Observable<LoteDto[]> {
    return this.http.get<ApiResponse<LoteDto[]>>(`${this.apiUrl}/para-cotizacion`).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  getLotesConPromociones(): Observable<LoteDto[]> {
    return this.http.get<ApiResponse<LoteDto[]>>(`${this.apiUrl}/con-promociones`).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  create(lote: CreateLoteDto): Observable<any> {
    const loteData = {
      ...lote,
      urbanizacionId: lote.esIndependiente ? null : Number(lote.urbanizacionId),
      superficieM2: Number(lote.superficieM2),
      precioBase: Number(lote.precioBase),
      esIndependiente: Boolean(lote.esIndependiente),
      latitud: lote.latitud ? Number(lote.latitud) : null,
      longitud: lote.longitud ? Number(lote.longitud) : null,
    };

    return this.http.post<ApiResponse<any>>(this.apiUrl, loteData).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al crear el lote');
      })
    );
  }

update(id: number, lote: UpdateLoteDto): Observable<any> {
  console.log('📤 Datos enviados al backend:', lote);
  
  return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, lote).pipe(
    map((response) => {
      if (response.success) {
        return response;
      }
      throw new Error(response.message || 'Error al actualizar el lote');
    })
  );
}

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al eliminar el lote');
      })
    );
  }
}