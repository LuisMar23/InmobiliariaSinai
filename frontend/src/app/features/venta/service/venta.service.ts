import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
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

interface VentasResponse {
  ventas: VentaDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface VentaResponse {
  venta: VentaDto;
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
  ): Observable<{ ventas: VentaDto[]; pagination: any }> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (asesorId) params.push(`asesorId=${asesorId}`);
    if (page > 1) params.push(`page=${page}`);
    if (limit !== 10) params.push(`limit=${limit}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<VentasResponse>>(url).pipe(
      map((response) => {
        return {
          ventas: response.data.ventas ? response.data.ventas.map((v) => this.parseVenta(v)) : [],
          pagination: response.data.pagination || {
            page,
            limit,
            total: response.data.ventas?.length || 0,
            pages: 1,
          },
        };
      }),
      catchError((error) => {
        console.error('Error loading sales:', error);
        return throwError(() => error);
      })
    );
  }

  getById(id: number): Observable<VentaDto> {
    return this.http.get<ApiResponse<VentaResponse>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success && response.data.venta) {
          return this.parseVenta(response.data.venta);
        }
        throw new Error('Venta no encontrada');
      }),
      catchError((error) => {
        console.error('Error loading sale:', error);
        return throwError(() => error);
      })
    );
  }

  create(venta: CreateVentaDto): Observable<any> {
    const ventaData: any = {
      clienteId: Number(venta.clienteId),
      inmuebleTipo: venta.inmuebleTipo,
      inmuebleId: Number(venta.inmuebleId),
      precioFinal: Number(venta.precioFinal),
      estado: venta.estado || 'PENDIENTE',
      observaciones: venta.observaciones,
      plan_pago: {
        monto_inicial: Number(venta.plan_pago.monto_inicial),
        plazo: Number(venta.plan_pago.plazo),
        periodicidad: venta.plan_pago.periodicidad,
        fecha_inicio: venta.plan_pago.fecha_inicio,
      },
    };

    return this.http.post<ApiResponse<any>>(this.apiUrl, ventaData).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al crear venta');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error creating sale:', error);
        return throwError(() => error);
      })
    );
  }

  update(id: number, venta: UpdateVentaDto): Observable<any> {
    const updateData: any = {};

    if (venta.clienteId !== undefined) updateData.clienteId = Number(venta.clienteId);
    if (venta.inmuebleTipo !== undefined) updateData.inmuebleTipo = venta.inmuebleTipo;
    if (venta.inmuebleId !== undefined) updateData.inmuebleId = Number(venta.inmuebleId);
    if (venta.precioFinal !== undefined) updateData.precioFinal = Number(venta.precioFinal);
    if (venta.estado !== undefined) updateData.estado = venta.estado;
    if (venta.observaciones !== undefined) updateData.observaciones = venta.observaciones;

    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, updateData).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al actualizar venta');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating sale:', error);
        return throwError(() => error);
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al eliminar venta');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error deleting sale:', error);
        return throwError(() => error);
      })
    );
  }

  crearPagoPlan(pagoData: RegistrarPagoDto): Observable<any> {
    const pagoDataFormatted = {
      plan_pago_id: Number(pagoData.plan_pago_id),
      monto: Number(pagoData.monto),
      fecha_pago: pagoData.fecha_pago,
      observacion: pagoData.observacion,
      metodoPago: pagoData.metodoPago || 'EFECTIVO',
    };

    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/pagos/registrar`, pagoDataFormatted)
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al crear pago');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error creating payment:', error);
          return throwError(() => error);
        })
      );
  }

  obtenerPagosPlan(planPagoId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/planes-pago/${planPagoId}/pagos`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al cargar pagos');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error loading payments:', error);
        return throwError(() => error);
      })
    );
  }

  obtenerResumenPlanPago(ventaId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${ventaId}/resumen-pago`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al cargar resumen');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error loading payment summary:', error);
        return throwError(() => error);
      })
    );
  }

  obtenerPlanesPagoActivos(page: number = 1, limit: number = 10): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/planes-pago/activos?page=${page}&limit=${limit}`)
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al cargar planes activos');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error loading active payment plans:', error);
          return throwError(() => error);
        })
      );
  }

  verificarMorosidadPlanPago(ventaId: number): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/planes-pago/${ventaId}/verificar-morosidad`, {})
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al verificar morosidad');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error checking delinquency:', error);
          return throwError(() => error);
        })
      );
  }

  obtenerVentasPorCliente(clienteId: number): Observable<VentaDto[]> {
    return this.http
      .get<ApiResponse<{ ventas: VentaDto[] }>>(`${this.apiUrl}/clientes/mis-ventas`)
      .pipe(
        map((response) => {
          if (response.success && response.data.ventas) {
            return response.data.ventas.map((venta) => this.parseVenta(venta));
          }
          return [];
        }),
        catchError((error) => {
          console.error('Error loading client sales:', error);
          return throwError(() => error);
        })
      );
  }

  private parseVenta(venta: any): VentaDto {
    return {
      ...venta,
      id: Number(venta.id),
      clienteId: Number(venta.clienteId),
      asesorId: Number(venta.asesorId),
      inmuebleId: Number(venta.inmuebleId),
      precioFinal: Number(venta.precioFinal || 0),
      cliente: venta.cliente
        ? {
            ...venta.cliente,
            id: Number(venta.cliente.id),
          }
        : undefined,
      asesor: venta.asesor
        ? {
            ...venta.asesor,
            id: Number(venta.asesor.id),
          }
        : undefined,
      lote: venta.lote
        ? {
            ...venta.lote,
            id: Number(venta.lote.id),
            superficieM2: Number(venta.lote.superficieM2 || 0),
            precioBase: Number(venta.lote.precioBase || 0),
            urbanizacion: venta.lote.urbanizacion
              ? {
                  ...venta.lote.urbanizacion,
                  id: Number(venta.lote.urbanizacion.id),
                }
              : undefined,
          }
        : undefined,
      planPago: venta.planPago
        ? {
            ...venta.planPago,
            id_plan_pago: Number(venta.planPago.id_plan_pago),
            total: Number(venta.planPago.total || 0),
            monto_inicial: Number(venta.planPago.monto_inicial || 0),
            plazo: Number(venta.planPago.plazo || 0),
            ventaId: Number(venta.planPago.ventaId),
            pagos: venta.planPago.pagos
              ? venta.planPago.pagos.map((pago: any) => ({
                  ...pago,
                  id_pago_plan: Number(pago.id_pago_plan),
                  plan_pago_id: Number(pago.plan_pago_id),
                  monto: Number(pago.monto || 0),
                }))
              : [],
            saldo_pendiente: Number(venta.planPago.saldo_pendiente || 0),
            total_pagado: Number(venta.planPago.total_pagado || 0),
            porcentaje_pagado: Number(venta.planPago.porcentaje_pagado || 0),
            monto_cuota: Number(venta.planPago.monto_cuota || 0),
            dias_restantes: Number(venta.planPago.dias_restantes || 0),
          }
        : undefined,
      archivos: venta.archivos || [],
      ingresos: venta.ingresos || [],
    };
  }
}
