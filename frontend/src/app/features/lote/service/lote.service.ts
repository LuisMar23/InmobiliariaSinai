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
    return this.http
      .get<ApiResponse<LoteDto[]>>(url)
      .pipe(map((response) => this.parseLotes(response.data)));
  }

  getById(id: number): Observable<LoteDto> {
    return this.http
      .get<ApiResponse<LoteDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => this.parseLote(response.data)));
  }

  create(lote: any): Observable<any> {
    const loteData = {
      ...lote,
      urbanizacionId: Number(lote.urbanizacionId),
      superficieM2: Number(lote.superficieM2),
      precioBase: Number(lote.precioBase),
      usuarioId: 1,
    };

    return this.http.post<any>(this.apiUrl, loteData).pipe(map((response) => response));
  }

  update(id: number, lote: any): Observable<any> {
    const loteData: any = {};

    if (lote.urbanizacionId !== undefined) loteData.urbanizacionId = Number(lote.urbanizacionId);
    if (lote.numeroLote !== undefined) loteData.numeroLote = lote.numeroLote;
    if (lote.superficieM2 !== undefined) loteData.superficieM2 = Number(lote.superficieM2);
    if (lote.precioBase !== undefined) loteData.precioBase = Number(lote.precioBase);
    if (lote.descripcion !== undefined) loteData.descripcion = lote.descripcion;
    if (lote.ubicacion !== undefined) loteData.ubicacion = lote.ubicacion;
    if (lote.estado !== undefined) loteData.estado = lote.estado;

    loteData.usuarioId = 1;

    return this.http.patch<any>(`${this.apiUrl}/${id}`, loteData).pipe(map((response) => response));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(map((response) => response));
  }

  private parseLote(lote: any): LoteDto {
    return {
      ...lote,
      superficieM2: Number(lote.superficieM2),
      precioBase: Number(lote.precioBase),
    };
  }

  private parseLotes(lotes: any[]): LoteDto[] {
    return lotes.map((lote) => this.parseLote(lote));
  }
}
