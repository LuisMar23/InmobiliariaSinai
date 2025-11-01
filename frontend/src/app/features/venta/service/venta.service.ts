import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  VentaDto,
  CreateVentaDto,
  UpdateVentaDto,
  RegistrarPagoDto,
} from '../../../core/interfaces/venta.interface';

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

  getAll(
    clienteId?: number,
    asesorId?: number,
    page: number = 1,
    limit: number = 10
  ): Observable<VentaDto[]> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (asesorId) params.push(`asesorId=${asesorId}`);
    if (page > 1) params.push(`page=${page}`);
    if (limit !== 10) params.push(`limit=${limit}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http
      .get<ApiResponse<{ ventas: VentaDto[] }>>(url)
      .pipe(map((response) => response.data.ventas || []));
  }

  getById(id: number): Observable<VentaDto> {
    return this.http
      .get<ApiResponse<{ venta: VentaDto }>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data.venta));
  }

  create(venta: CreateVentaDto): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, venta);
  }

  update(id: number, venta: UpdateVentaDto): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, venta);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  // Métodos para plan de pagos - CORREGIDOS
  crearPagoPlan(pagoData: RegistrarPagoDto): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/pagos/registrar`, pagoData);
  }

  obtenerPagosPlan(planPagoId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/planes-pago/${planPagoId}/pagos`);
  }

  obtenerResumenPlanPago(ventaId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${ventaId}/resumen-pago`);
  }

  obtenerPlanesPagoActivos(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/planes-pago/activos?page=${page}&limit=${limit}`
    );
  }

  verificarMorosidadPlanPago(planPagoId: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/planes-pago/${planPagoId}/verificar-morosidad`,
      {}
    );
  }

  obtenerVentasPorCliente(clienteId: number): Observable<VentaDto[]> {
    return this.http
      .get<ApiResponse<{ ventas: VentaDto[] }>>(`${this.apiUrl}/clientes/mis-ventas`)
      .pipe(map((response) => response.data.ventas || []));
  }
}
