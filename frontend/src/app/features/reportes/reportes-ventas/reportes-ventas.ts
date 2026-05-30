import { Component, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltrosReporteDto } from '../../../core/interfaces/reportes.interface';
import { ReportesService } from '../services/reportes.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { UrbanizacionContextService } from '../../../core/services/urbanizacion-context.service';
import { AuthService } from '../../../components/services/auth.service';
import { ManzanoService } from '../../manzano/service/manzano.service';

interface ManzanoDto {
  id: number;
  uuid: string;
  nombre: string;
}

type TipoReporte = 'general' | 'vendedores' | 'detalle' | 'cuotas' | 'completadas' | 'cliente' | 'creditos' | 'anuladas';
type TipoAlcance = 'global' | 'urbanizacion';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
template: `
<div class="w-full max-w-8xl mx-auto px-4 py-4 flex flex-col gap-3">

    <!-- ─── Selector de Alcance ─── -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <i class="fa-solid fa-chart-pie text-emerald-700 text-sm"></i>
        <span class="text-sm font-semibold text-slate-800">Alcance del Reporte</span>
      </div>
      <div class="px-4 py-3 flex flex-wrap items-center gap-3">
        <button
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          [class.bg-emerald-700]="tipoAlcance() === 'urbanizacion'"
          [class.text-white]="tipoAlcance() === 'urbanizacion'"
          [class.border]="tipoAlcance() === 'urbanizacion'"
          [class.border-emerald-700]="tipoAlcance() === 'urbanizacion'"
          [class.bg-white]="tipoAlcance() !== 'urbanizacion'"
          [class.text-slate-700]="tipoAlcance() !== 'urbanizacion'"
          [class.border]="tipoAlcance() !== 'urbanizacion'"
          [class.border-slate-300]="tipoAlcance() !== 'urbanizacion'"
          (click)="cambiarAlcance('urbanizacion')">
          <i class="fa-solid fa-building"></i>
          Por Urbanización: <strong>{{ nombreUrbanizacionActual() }}</strong>
        </button>

        @if (isAdmin()) {
          <button
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            [class.bg-purple-700]="tipoAlcance() === 'global'"
            [class.text-white]="tipoAlcance() === 'global'"
            [class.border]="tipoAlcance() === 'global'"
            [class.border-purple-700]="tipoAlcance() === 'global'"
            [class.bg-white]="tipoAlcance() !== 'global'"
            [class.text-slate-700]="tipoAlcance() !== 'global'"
            [class.border]="tipoAlcance() !== 'global'"
            [class.border-slate-300]="tipoAlcance() !== 'global'"
            (click)="cambiarAlcance('global')">
            <i class="fa-solid fa-globe"></i>
            Global (Todos los datos)
          </button>
        }

        @if (tipoAlcance() === 'urbanizacion' && !urbanizacionActiva()) {
          <div class="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg text-xs">
            <i class="fa-solid fa-triangle-exclamation"></i>
            No hay urbanización seleccionada.
          </div>
        }
      </div>
    </div>

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

      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-emerald-700 text-sm"></i>
          <span class="text-sm font-semibold text-slate-800">
            Reporte de Ventas
            <span class="text-emerald-700 font-bold ml-1">{{ nombreUrbanizacionActual() }}</span>
            @if (tipoAlcance() === 'global') {
              <span class="text-purple-700 font-bold ml-1">(Global)</span>
            }
          </span>
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

        <!-- ✅ Selector de Manzana — ahora usa id como value -->
        <div class="flex flex-col gap-1">
          <span class="text-[11px] font-medium text-slate-500">Filtrar por Manzana</span>
          <select
            class="border border-slate-200 rounded-lg px-2 text-xs h-8 outline-none text-slate-800 bg-white cursor-pointer min-w-[140px] focus:border-emerald-600"
            [(ngModel)]="filtros.manzanoId">
            <option [ngValue]="null">Todas...</option>
            <option *ngFor="let m of manzanas()" [ngValue]="m.id">{{ m.nombre }}</option>
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
      </div>
    </div>

    <!-- ─── Loading / Error / Vista Previa (sin cambios) ─── -->
    <!-- ... igual que antes ... -->

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
  private urbanizacionContext = inject(UrbanizacionContextService);
  private authService = inject(AuthService);

  reporteActual = signal<TipoReporte | null>(null);
  tipoAlcance = signal<TipoAlcance>('urbanizacion');
  filtrarPorFechas = false;

  // ✅ manzanos ahora es signal de objetos, y manzanoId en filtros es number | null
  manzanas = signal<ManzanoDto[]>([]);

  filtros: FiltrosReporteDto & {
    clienteId?: number;
    manzanoId?: number | null;  // ← era manzana: string
    vendedorId?: number;
  } = { manzanoId: null };

  urbanizacionActiva = this.urbanizacionContext.urbanizacion;

  isAdmin = computed(() => {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMINISTRADOR';
  });

  nombreUrbanizacionActual = computed(() => {
    return this.urbanizacionActiva()?.nombre || 'Sin urbanización seleccionada';
  });

  vendedores: { id: number; nombre: string }[] = [];

  constructor() {
    effect(() => {
      const v = this.reportesService.ventasPorVendedor();
      if (v?.vendedores) {
        this.vendedores = v.vendedores.map((x: any) => ({
          id: x.asesor.id,
          nombre: x.asesor.fullName,
        }));
      }
    });
  }

  ngOnInit() {
    this.urbanizacionContext.recuperar();
    this.cargarManzanos();
    this.seleccionarReporte('general');
  }
private manzanoService = inject(ManzanoService);

async cargarManzanos() {
  const lista = await this.manzanoService.getManzanosDeUrbanizacionActiva();
  this.manzanas.set(lista);
}

  cambiarAlcance(alcance: TipoAlcance) {
    this.tipoAlcance.set(alcance);
    // Al cambiar a urbanización, recargar manzanos
    if (alcance === 'urbanizacion') this.cargarManzanos();
    this.aplicarFiltros();
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
    if (this.filtros.vendedorId) f.vendedorId = this.filtros.vendedorId;

    // ✅ Filtro de manzana ahora usa manzanoId numérico
    if (this.filtros.manzanoId) f.manzanoId = this.filtros.manzanoId;

    if (this.tipoAlcance() === 'global') {
      if (!this.isAdmin()) return;
      f.global = true;
    } else {
      const urbanizacion = this.urbanizacionActiva();
      if (!urbanizacion?.id) return;
      f.urbanizacionId = urbanizacion.id;
    }

    switch (this.reporteActual()) {
      case 'general':     this.reportesService.getReporteVentas(f);        break;
      case 'vendedores':  this.reportesService.getVentasPorVendedor(f);    break;
      case 'detalle':     this.reportesService.getDetalleVentas(f);        break;
      case 'cuotas':      this.reportesService.getCuotasPorCobrar(f);      break;
      case 'completadas': this.reportesService.getVentasCompletadas(f);    break;
      case 'creditos':    this.reportesService.getCuotasPorCobrar(f);      break;
      case 'anuladas':    this.reportesService.getReporteVentas({ ...f, estado: 'ANULADO' }); break;
      case 'cliente':
        if (this.filtros.clienteId) {
          this.reportesService.getVentasPorCliente({ clienteId: this.filtros.clienteId, ...f });
        }
        break;
    }
  }

  // descargarPDF, getTituloReporte, getEstadoClass — sin cambios
  async descargarPDF() {
    const tipo = this.reporteActual();
    if (!tipo) return;
    const infoAdicional = {
      alcance: this.tipoAlcance(),
      urbanizacionNombre: this.urbanizacionActiva()?.nombre,
      fechaGeneracion: new Date().toLocaleString(),
      usuario: this.authService.getCurrentUser()?.fullName,
    };
    try {
      switch (tipo) {
        case 'general':     await this.pdfService.generarReporteGeneral(this.reportesService.reporteVentas(), this.filtros, infoAdicional); break;
        case 'vendedores':  await this.pdfService.generarReporteVendedores(this.reportesService.ventasPorVendedor(), this.filtros, infoAdicional); break;
        case 'detalle':     await this.pdfService.generarReporteDetalle(this.reportesService.detalleVentas(), this.filtros, infoAdicional); break;
        case 'cuotas':      await this.pdfService.generarReporteCuotas(this.reportesService.cuotasPorCobrar(), this.filtros, infoAdicional); break;
        case 'completadas': await this.pdfService.generarReporteCompletadas(this.reportesService.ventasCompletadas(), this.filtros, infoAdicional); break;
        case 'cliente':     await this.pdfService.generarReporteCliente(this.reportesService.ventasPorCliente(), this.filtros, infoAdicional); break;
      }
    } catch (e) {
      console.error('Error generando PDF:', e);
    }
  }

  getTituloReporte(): string {
    const baseTitulo: Record<TipoReporte, string> = {
      general:     'Reporte General de Ventas',
      vendedores:  'Ventas por Vendedor',
      detalle:     'Detalle de Ventas',
      cuotas:      'Cuotas por Cobrar',
      completadas: 'Ventas Completadas',
      cliente:     'Ventas por Cliente',
      creditos:    'Créditos por Cobrar',
      anuladas:    'Ventas Anuladas',
    };
    const alcance = this.tipoAlcance() === 'global'
      ? ' (Global)'
      : ` (${this.nombreUrbanizacionActual()})`;
    return (baseTitulo[this.reporteActual() as TipoReporte] || 'Reporte') + alcance;
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