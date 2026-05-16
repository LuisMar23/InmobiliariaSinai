// reportes.component.ts
import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltrosReporteDto } from '../../../core/interfaces/reportes.interface';
import { ReportesService } from '../services/reportes.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';

type TipoReporte = 'general' | 'vendedores' | 'detalle' | 'cuotas' | 'completadas' | 'cliente' | 'creditos' | 'anuladas';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
template: `
  <div class="w-full max-w-8xl mx-auto px-4 py-4 flex flex-col gap-3">

    <!-- ─── Filtros Generales ─── -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <i class="fa-solid fa-sliders text-emerald-700 text-sm"></i>
        <span class="text-sm font-semibold text-slate-800">Filtros Generales</span>
        <span class="text-xs text-slate-400 italic">— Rango de Fechas</span>
      </div>
      <div class="px-4 py-3 flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer select-none">
          <span class="relative inline-flex w-8 h-5 flex-shrink-0">
            <input type="checkbox" class="peer sr-only" [(ngModel)]="filtrarPorFechas">
            <span class="absolute inset-0 bg-slate-300 rounded-full transition-colors peer-checked:bg-emerald-700"></span>
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-3"></span>
          </span>
          <span class="text-xs font-medium text-slate-700">Filtrar por Fechas</span>
        </label>

        <div class="flex flex-col gap-1" [class.opacity-40]="!filtrarPorFechas" [class.pointer-events-none]="!filtrarPorFechas">
          <span class="text-[11px] font-medium text-slate-500">Fecha de Inicio <span class="text-red-500">*</span></span>
          <input type="date" class="border border-slate-200 rounded-lg px-2 py-1 text-xs h-8 outline-none text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100"
            [(ngModel)]="filtros.fechaInicio" [disabled]="!filtrarPorFechas">
        </div>
        <div class="flex flex-col gap-1" [class.opacity-40]="!filtrarPorFechas" [class.pointer-events-none]="!filtrarPorFechas">
          <span class="text-[11px] font-medium text-slate-500">Fecha de Fin <span class="text-red-500">*</span></span>
          <input type="date" class="border border-slate-200 rounded-lg px-2 py-1 text-xs h-8 outline-none text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100"
            [(ngModel)]="filtros.fechaFin" [disabled]="!filtrarPorFechas">
        </div>
      </div>
    </div>

    <!-- ─── Reporte de Ventas ─── -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

      <!-- Título -->
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-emerald-700 text-sm"></i>
          <span class="text-sm font-semibold text-slate-800">
            Reporte de Ventas
            <span class="text-emerald-700 font-bold ml-1">{{ urbanizacionActual }}</span>
          </span>
          <i class="fa-regular fa-circle-play text-slate-400 text-sm cursor-pointer" title="Ver tutorial"></i>
        </div>
        <div class="flex gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
        </div>
      </div>

      <div class="h-px bg-slate-100"></div>

      <!-- Fila 1 -->
      <div class="flex flex-wrap items-end gap-2 px-4 py-3">
        <div class="flex flex-col gap-1">
          <span class="text-[11px] font-medium text-slate-500">Filtrar por Manzana</span>
          <select class="border border-slate-200 rounded-lg px-2 text-xs h-8 outline-none text-slate-800 bg-white cursor-pointer min-w-[140px] focus:border-emerald-600"
            [(ngModel)]="filtros.manzana">
            <option value="">Todas...</option>
            <option *ngFor="let m of manzanas" [value]="m">{{ m }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[11px] font-medium text-slate-500">Filtrar por Tipo de Venta</span>
          <select class="border border-slate-200 rounded-lg px-2 text-xs h-8 outline-none text-slate-800 bg-white cursor-pointer min-w-[140px] focus:border-emerald-600"
            [(ngModel)]="filtros.tipoVenta">
            <option value="">Todos...</option>
            <option value="LOTE">LOTE</option>
            <option value="PROPIEDAD">PROPIEDAD</option>
          </select>
        </div>
        <button class="inline-flex items-center gap-1.5 border-[1.5px] border-emerald-700 text-emerald-700 rounded-lg px-3 text-xs font-medium h-8 cursor-pointer bg-transparent hover:bg-emerald-700 hover:text-white transition-colors"
          [class.!bg-emerald-700]="reporteActual() === 'general'"
          [class.!text-white]="reporteActual() === 'general'"
          (click)="seleccionarReporte('general')">
          <i class="fa-solid fa-chart-bar text-xs"></i> Reporte de Ventas
        </button>
        <button class="inline-flex items-center gap-1.5 border-[1.5px] border-teal-700 text-teal-700 rounded-lg px-3 text-xs font-medium h-8 cursor-pointer bg-transparent hover:bg-teal-700 hover:text-white transition-colors"
          [class.!bg-teal-700]="reporteActual() === 'detalle'"
          [class.!text-white]="reporteActual() === 'detalle'"
          (click)="seleccionarReporte('detalle')">
          <i class="fa-regular fa-file-lines text-xs"></i> Detalle de Ventas
        </button>
      </div>

      <!-- Fila 2 -->
      <div class="flex flex-wrap items-end gap-2 px-4 pb-3">
        <div class="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span class="text-[11px] font-medium text-slate-500">Filtrar por Vendedor</span>
          <select class="border border-slate-200 rounded-lg px-2 text-xs h-8 outline-none text-slate-800 bg-white cursor-pointer w-full focus:border-emerald-600"
            [(ngModel)]="filtros.vendedorId">
            <option value="">Todos los Vendedores...</option>
            <option *ngFor="let v of vendedores" [value]="v.id">{{ v.nombre }}</option>
          </select>
        </div>
        <button class="inline-flex items-center gap-1.5 border-[1.5px] border-violet-600 text-violet-600 rounded-lg px-3 text-xs font-medium h-8 cursor-pointer bg-transparent hover:bg-violet-600 hover:text-white transition-colors"
          [class.!bg-violet-600]="reporteActual() === 'vendedores'"
          [class.!text-white]="reporteActual() === 'vendedores'"
          (click)="seleccionarReporte('vendedores')">
          <i class="fa-solid fa-users text-xs"></i> Ventas x Vendedor
        </button>
        <button class="inline-flex items-center gap-1.5 border-[1.5px] border-cyan-600 text-cyan-600 rounded-lg px-3 text-xs font-medium h-8 cursor-pointer bg-transparent hover:bg-cyan-600 hover:text-white transition-colors"
          [class.!bg-cyan-600]="reporteActual() === 'cuotas'"
          [class.!text-white]="reporteActual() === 'cuotas'"
          (click)="seleccionarReporte('cuotas')">
          <i class="fa-regular fa-folder-open text-xs"></i> Cuotas x Cobrar
        </button>
      </div>

      <div class="h-px bg-slate-100"></div>

      <!-- Fila 3 -->
      <div class="flex flex-wrap items-end gap-2 px-4 py-3">
        <button class="inline-flex items-center gap-1.5 border-[1.5px] border-slate-500 text-slate-500 rounded-lg px-3 text-xs font-medium h-8 cursor-pointer bg-transparent hover:bg-slate-500 hover:text-white transition-colors"
          [class.!bg-slate-500]="reporteActual() === 'completadas'"
          [class.!text-white]="reporteActual() === 'completadas'"
          (click)="seleccionarReporte('completadas')">
          <i class="fa-regular fa-circle-check text-xs"></i> Ventas Completadas
        </button>
        <!-- <button class="inline-flex items-center gap-1.5 border-[1.5px] border-amber-700 text-amber-700 rounded-lg px-3 text-xs font-medium h-8 cursor-pointer bg-transparent hover:bg-amber-700 hover:text-white transition-colors"
          [class.!bg-amber-700]="reporteActual() === 'anuladas'"
          [class.!text-white]="reporteActual() === 'anuladas'"
          (click)="seleccionarReporte('anuladas')">
          <i class="fa-solid fa-list-check text-xs"></i> Ventas Anuladas
        </button> -->
      </div>
    </div>

    <!-- ─── Loading ─── -->
    <div *ngIf="reportesService.loading()" class="flex flex-col items-center gap-3 py-10 text-slate-500 text-sm">
      <div class="w-9 h-9 border-[3px] border-slate-200 border-t-emerald-700 rounded-full animate-spin"></div>
      <p>Cargando reporte...</p>
    </div>

    <!-- ─── Error ─── -->
    <div *ngIf="reportesService.error()" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <i class="fa-solid fa-triangle-exclamation"></i>
      {{ reportesService.error() }}
    </div>

    <!-- ─── Vista Previa ─── -->
    <div *ngIf="!reportesService.loading() && reporteActual()" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <i class="fa-regular fa-eye text-emerald-700 text-sm"></i>
        <span class="text-sm font-semibold text-slate-800">Vista Previa: {{ getTituloReporte() }}</span>
        <button (click)="descargarPDF()"
          class="ml-auto inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border-0 cursor-pointer">
          <i class="fa-solid fa-file-pdf"></i> Descargar PDF
        </button>
      </div>

      <div class="p-4 max-h-[520px] overflow-y-auto">
        <div [ngSwitch]="reporteActual()">

          <!-- General -->
          <div *ngSwitchCase="'general'">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div class="bg-blue-50 rounded-xl p-3">
                <span class="text-[11px] text-blue-700 block mb-1">Total Ventas</span>
                <span class="text-2xl font-bold text-blue-700">{{ reportesService.reporteVentas()?.resumen?.totalVentas || 0 }}</span>
              </div>
              <div class="bg-emerald-50 rounded-xl p-3">
                <span class="text-[11px] text-emerald-700 block mb-1">Monto Total</span>
                <span class="text-2xl font-bold text-emerald-700">{{ reportesService.reporteVentas()?.resumen?.montoTotal | currency:'BOB' }}</span>
              </div>
              <div class="bg-yellow-50 rounded-xl p-3">
                <span class="text-[11px] text-yellow-700 block mb-1">Pendientes</span>
                <span class="text-2xl font-bold text-yellow-700">{{ reportesService.reporteVentas()?.resumen?.porEstado?.pendiente || 0 }}</span>
              </div>
              <div class="bg-emerald-50 rounded-xl p-3">
                <span class="text-[11px] text-emerald-700 block mb-1">Pagados</span>
                <span class="text-2xl font-bold text-emerald-700">{{ reportesService.reporteVentas()?.resumen?.porEstado?.pagado || 0 }}</span>
              </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full border-collapse text-xs">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-500 border-b border-slate-200">ID</th>
                    <th class="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-500 border-b border-slate-200">Cliente</th>
                    <th class="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-500 border-b border-slate-200">Monto</th>
                    <th class="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-500 border-b border-slate-200">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let venta of reportesService.reporteVentas()?.ventas | slice:0:5" class="hover:bg-slate-50 transition-colors">
                    <td class="px-3 py-2 text-slate-700 border-b border-slate-100">#{{ venta.id }}</td>
                    <td class="px-3 py-2 text-slate-700 border-b border-slate-100">{{ venta.cliente?.fullName }}</td>
                    <td class="px-3 py-2 text-slate-700 border-b border-slate-100">{{ venta.precioFinal | currency:'BOB' }}</td>
                    <td class="px-3 py-2 border-b border-slate-100">
                      <span [class]="getEstadoClass(venta.estado)">{{ venta.estado }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Vendedores -->
          <div *ngSwitchCase="'vendedores'" class="flex flex-col gap-2">
            <div *ngFor="let v of reportesService.ventasPorVendedor()?.vendedores"
              class="flex justify-between items-center border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors">
              <div>
                <p class="text-sm font-semibold text-slate-800 m-0">{{ v.asesor.fullName }}</p>
                <p class="text-[11px] text-slate-400 m-0">{{ v.totalVentas }} ventas</p>
              </div>
              <div class="text-right">
                <p class="text-base font-bold text-emerald-700 m-0">{{ v.montoTotal | currency:'BOB' }}</p>
                <p class="text-[11px] text-slate-400 m-0">Pagadas: {{ v.ventasPagadas }} | Pendientes: {{ v.ventasPendientes }}</p>
              </div>
            </div>
          </div>

          <!-- Cuotas -->
          <div *ngSwitchCase="'cuotas'">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div class="bg-red-50 rounded-xl p-3">
                <span class="text-[11px] text-red-700 block mb-1">Total por Cobrar</span>
                <span class="text-2xl font-bold text-red-700">{{ reportesService.cuotasPorCobrar()?.resumen?.totalPorCobrar | currency:'BOB' }}</span>
              </div>
              <div class="bg-yellow-50 rounded-xl p-3">
                <span class="text-[11px] text-yellow-700 block mb-1">Planes Vencidos</span>
                <span class="text-2xl font-bold text-yellow-700">{{ reportesService.cuotasPorCobrar()?.resumen?.planesVencidos || 0 }}</span>
              </div>
            </div>
            <div class="flex flex-col gap-2 mt-2">
              <div *ngFor="let c of reportesService.cuotasPorCobrar()?.cuotas | slice:0:3"
                class="border-l-[3px] border-amber-400 bg-slate-50 px-3 py-2 rounded-r-lg">
                <p class="text-xs font-semibold text-slate-800 m-0">{{ c.venta?.cliente?.fullName }}</p>
                <p class="text-[11px] text-slate-400 m-0">Saldo: {{ c.saldoPendiente | currency:'BOB' }} | Vence: {{ c.fechaVencimiento | date }}</p>
              </div>
            </div>
          </div>

          <!-- Default -->
          <div *ngSwitchDefault class="flex flex-col items-center gap-3 py-10 text-slate-400">
            <i class="fa-regular fa-file-chart-column text-3xl"></i>
            <p class="text-sm">Use el botón <strong class="text-slate-600">Descargar PDF</strong> para obtener el reporte completo.</p>
          </div>

        </div>
      </div>
    </div>

  </div>
`,
styles: [`
  :host { display: block; }
  .badge-pagado    { @apply px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700; }
  .badge-pendiente { @apply px-2 py-0.5 rounded-full text-[10px] bg-yellow-100 text-yellow-700; }
  .badge-cancelado { @apply px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700; }
`]
})
export class ReportesComponent implements OnInit {
  reportesService = inject(ReportesService);
  private pdfService = inject(PdfGeneratorService);

  reporteActual = signal<TipoReporte | null>(null);
filtrarPorFechas = false;

  filtros: FiltrosReporteDto & { clienteId?: number; manzana?: string; vendedorId?: number } = {};

  urbanizacionActual = 'NUEVA ESPERANZA (BERMEJO)';

  // Listas para selects (poblar desde tu servicio si tienes endpoints)
get manzanas(): string[] {
  return this.reportesService.manzanas();
}
  vendedores: { id: number; nombre: string }[] = [];

  constructor() {
    effect(() => {
      const v = this.reportesService.ventasPorVendedor();
      if (v?.vendedores) {
        this.vendedores = v.vendedores.map((x: any) => ({
          id: x.asesor.id,
          nombre: x.asesor.fullName
        }));
      }
    });
  }
ngOnInit() {
  this.reportesService.getManzanas(); // carga sin filtros → todas las manzanas
  this.seleccionarReporte('general');
}

  seleccionarReporte(tipo: TipoReporte) {
    this.reporteActual.set(tipo);
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    if (!this.reporteActual()) return;

    const f: any = {};
    if (this.filtrarPorFechas) {
      if (this.filtros.fechaInicio) f.fechaInicio = this.filtros.fechaInicio;
      if (this.filtros.fechaFin)    f.fechaFin    = this.filtros.fechaFin;
    }
    if (this.filtros.tipoVenta)  f.tipoVenta  = this.filtros.tipoVenta;
  if (this.filtros.manzana) f.manzano = this.filtros.manzana
    if (this.filtros.vendedorId) f.vendedorId = this.filtros.vendedorId;

    switch (this.reporteActual()) {
      case 'general':      this.reportesService.getReporteVentas(f);        break;
      case 'vendedores':   this.reportesService.getVentasPorVendedor(f);    break;
      case 'detalle':      this.reportesService.getDetalleVentas(f);        break;
      case 'cuotas':       this.reportesService.getCuotasPorCobrar(f);      break;
      case 'completadas':  this.reportesService.getVentasCompletadas(f);    break;
      case 'creditos':     this.reportesService.getCuotasPorCobrar(f);      break; // ajusta al endpoint real
      case 'anuladas':     this.reportesService.getReporteVentas({ ...f, estado: 'ANULADO' }); break;
      case 'cliente':
        if (this.filtros.clienteId) {
          this.reportesService.getVentasPorCliente({ clienteId: this.filtros.clienteId, ...f });
        }
        break;
    }
  }

  async descargarPDF() {
    const tipo = this.reporteActual();
    if (!tipo) return;
    try {
      switch (tipo) {
        case 'general':     await this.pdfService.generarReporteGeneral(this.reportesService.reporteVentas(), this.filtros); break;
        case 'vendedores':  await this.pdfService.generarReporteVendedores(this.reportesService.ventasPorVendedor(), this.filtros); break;
        case 'detalle':     await this.pdfService.generarReporteDetalle(this.reportesService.detalleVentas(), this.filtros); break;
        case 'cuotas':      await this.pdfService.generarReporteCuotas(this.reportesService.cuotasPorCobrar(), this.filtros); break;
        case 'completadas': await this.pdfService.generarReporteCompletadas(this.reportesService.ventasCompletadas(), this.filtros); break;
        case 'cliente':     await this.pdfService.generarReporteCliente(this.reportesService.ventasPorCliente(), this.filtros); break;
      }
    } catch (e) {
      console.error('Error generando PDF:', e);
    }
  }

  getTituloReporte(): string {
    const t: Record<TipoReporte, string> = {
      general:     'Reporte General de Ventas',
      vendedores:  'Ventas por Vendedor',
      detalle:     'Detalle de Ventas',
      cuotas:      'Cuotas por Cobrar',
      completadas: 'Ventas Completadas',
      cliente:     'Ventas por Cliente',
      creditos:    'Créditos por Cobrar',
      anuladas:    'Ventas Anuladas',
    };
    return t[this.reporteActual() as TipoReporte] ?? '';
  }

  getEstadoClass(estado: string): string {
    const m: Record<string, string> = {
      PAGADO:    'badge-pagado',
      PENDIENTE: 'badge-pendiente',
      CANCELADO: 'badge-cancelado',
    };
    return m[estado] ?? '';
  }
}