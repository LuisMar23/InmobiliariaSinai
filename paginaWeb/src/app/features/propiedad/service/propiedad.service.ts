// src/app/modules/propiedades/services/propiedad.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Propiedad } from '../../../core/interfaces/datos.interface';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PropiedadService {
  private baseUrl = environment.apiUrl + '/propiedades';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Propiedad[]> {
    return this.http
      .get<{ success: boolean; data: any[] }>(this.baseUrl)
      .pipe(map((response) => this.mapearPropiedades(response.data)));
  }

  getByUuid(uuid: string): Observable<Propiedad> {
    return this.http
      .get<{ success: boolean; data: any }>(`${this.baseUrl}/uuid/${uuid}`)
      .pipe(map((response) => this.mapearPropiedad(response.data)));
  }

  filtrar(filtros: any): Observable<Propiedad[]> {
    return this.http
      .post<{ success: boolean; data: any[] }>(`${this.baseUrl}/filtrar`, filtros)
      .pipe(map((response) => this.mapearPropiedades(response.data)));
  }

  getPorTipo(tipo: string): Observable<Propiedad[]> {
    return this.http
      .get<{ success: boolean; data: any[] }>(`${this.baseUrl}/tipo/${tipo}`)
      .pipe(map((response) => this.mapearPropiedades(response.data)));
  }

  getPorEstadoPropiedad(estado: string): Observable<Propiedad[]> {
    return this.http
      .get<{ success: boolean; data: any[] }>(`${this.baseUrl}/estado-propiedad/${estado}`)
      .pipe(map((response) => this.mapearPropiedades(response.data)));
  }

  private mapearPropiedades(propiedades: any[]): Propiedad[] {
    return propiedades.map((prop) => this.mapearPropiedad(prop));
  }

  private mapearPropiedad(propiedad: any): Propiedad {
    return {
      ...propiedad,
      archivos:
        propiedad.archivos?.map((archivo: any) => ({
          id: archivo.id,
          uuid: archivo.uuid || '',
          url: archivo.urlArchivo, // ← Mapea urlArchivo del backend a url del frontend
          tipo: archivo.tipoArchivo, // ← Mapea tipoArchivo del backend a tipo del frontend
          nombre: archivo.nombreArchivo, // ← Mapea nombreArchivo del backend a nombre del frontend
        })) || [],
    };
  }
}
