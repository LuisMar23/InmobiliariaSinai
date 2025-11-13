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
    const loteData: any = {};

    if (lote.urbanizacionId !== undefined) {
      loteData.urbanizacionId = lote.esIndependiente ? null : Number(lote.urbanizacionId);
    }
    if (lote.numeroLote !== undefined) loteData.numeroLote = lote.numeroLote;
    if (lote.superficieM2 !== undefined) loteData.superficieM2 = Number(lote.superficieM2);
    if (lote.precioBase !== undefined) loteData.precioBase = Number(lote.precioBase);
    if (lote.descripcion !== undefined) loteData.descripcion = lote.descripcion;
    if (lote.ubicacion !== undefined) loteData.ubicacion = lote.ubicacion;
    if (lote.estado !== undefined) loteData.estado = lote.estado;
    if (lote.ciudad !== undefined) loteData.ciudad = lote.ciudad;
    if (lote.esIndependiente !== undefined)
      loteData.esIndependiente = Boolean(lote.esIndependiente);
    if (lote.latitud !== undefined) loteData.latitud = lote.latitud ? Number(lote.latitud) : null;
    if (lote.longitud !== undefined)
      loteData.longitud = lote.longitud ? Number(lote.longitud) : null;

    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, loteData).pipe(
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
