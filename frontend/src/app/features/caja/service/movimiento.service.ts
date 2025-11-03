import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Movimiento } from '../../../core/interfaces/caja.interface';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private apiUrl = `${environment.apiUrl}/movimientos`;

  movimientos = signal<Movimiento[]>([]);
  totales = signal<Record<string, number>>({});
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  cargando = signal(false);

  constructor(private http: HttpClient) {}

  loadByCaja(cajaId: number, page: number = 1, pageSize: number = 10) {
    this.cargando.set(true);
    this.http
      .get<{ data: Movimiento[]; total: number; page: number; pageSize: number }>(
        `${this.apiUrl}/caja/${cajaId}?page=${page}&pageSize=${pageSize}`
      )
      .subscribe({
        next: (res) => {
          this.movimientos.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.pageSize.set(res.pageSize);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
        },
      });
  }

  crearMovimiento(payload: {
    cajaId: number;
    tipo: 'INGRESO' | 'EGRESO';
    monto: number;
    descripcion?: string;
    metodoPago?: string;
    referencia?: string;
  }) {
    return this.http.post<Movimiento>(this.apiUrl, payload);
  }

  loadTotales(cajaId: number) {
    this.http
      .get<Record<string, number>>(`${this.apiUrl}/caja/${cajaId}/totales`)
      .subscribe((res) => this.totales.set(res));
  }

  getResumenCaja(cajaId: number) {
    return this.http.get<any>(`${this.apiUrl}/caja/${cajaId}/resumen`);
  }
}
