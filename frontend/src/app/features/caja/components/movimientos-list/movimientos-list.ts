import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Movimiento } from '../../../../core/interfaces/caja.interface';
import { MovimientoService } from '../../service/movimiento.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface ColumnConfig {
  key: keyof Movimiento;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-movimientos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './movimientos-list.html',
})
export class MovimientosList implements OnInit {
  private route = inject(ActivatedRoute);
  private movSvc = inject(MovimientoService);
  private notificationSvc = inject(NotificationService);

  movimientos = signal<Movimiento[]>([]);
  allMovimientos = signal<Movimiento[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  cajaId = signal<number>(0);
  resumenFiltrado = signal<{ totalIngresos: number; totalEgresos: number } | null>(null);

  // Filtros
  filtroMes = signal<number | null>(null);
  filtroAnio = signal<number>(new Date().getFullYear());
  filtroTipo = signal<string>('');
  filtroMetodoPago = signal<string>('');
  filtroManzano = signal<string>('');
  filtroNumeroLote = signal<string>('');

  aniosDisponibles = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  metodosPago = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

  sortColumn = signal<keyof Movimiento>('fecha');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'monto', label: 'Monto', sortable: true },
    { key: 'metodoPago', label: 'Método Pago', sortable: true },
    { key: 'descripcion', label: 'Descripción', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  filteredMovimientos = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let movimientos = this.allMovimientos();

    if (term) {
      movimientos = movimientos.filter(
        (movimiento: Movimiento) =>
          movimiento.descripcion?.toLowerCase().includes(term) ||
          movimiento.tipo.toLowerCase().includes(term) ||
          movimiento.metodoPago.toLowerCase().includes(term) ||
          movimiento.fecha.toLowerCase().includes(term),
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return movimientos;

    return [...movimientos].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (column === 'fecha') {
        return direction === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      return direction === 'asc'
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  });

  resumenCaja = signal<any>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.cajaId.set(id);
      if (id) {
        this.obtenerMovimientos();
        this.obtenerResumenCaja();
      }
    });
  }

  obtenerMovimientos() {
    this.cargando.set(true);
    this.error.set(null);

    this.movSvc.loadByCajaFiltrado(
      this.cajaId(),
      this.currentPage(),
      this.pageSize(),
      {
        mes: this.filtroMes() ?? undefined,
        anio: this.filtroAnio(),
        tipo: this.filtroTipo() || undefined,
        metodoPago: this.filtroMetodoPago() || undefined,
        manzano: this.filtroManzano() || undefined,
        numeroLote: this.filtroNumeroLote() || undefined,
      },
    ).subscribe({
      next: (response) => {
        this.allMovimientos.set(response.data);
        this.movimientos.set(response.data);
        this.total.set(response.total);
        if (response.resumen) {
          this.resumenFiltrado.set(response.resumen);
        }
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('Error al cargar los movimientos');
        this.notificationSvc.showError('Error al cargar los movimientos');
      },
    });
  }

  obtenerResumenCaja() {
    this.movSvc.getResumenCaja(this.cajaId()).subscribe({
      next: (resumen) => this.resumenCaja.set(resumen),
      error: (err) => {
        console.error('Error al obtener resumen:', err);
        this.notificationSvc.showError('Error al obtener el resumen de caja');
      },
    });
  }

  aplicarFiltros() {
    this.currentPage.set(1);
    this.obtenerMovimientos();
  }

  limpiarFiltros() {
    this.filtroMes.set(null);
    this.filtroAnio.set(new Date().getFullYear());
    this.filtroTipo.set('');
    this.filtroMetodoPago.set('');
    this.filtroManzano.set('');
    this.filtroNumeroLote.set('');
    this.currentPage.set(1);
    this.obtenerMovimientos();
  }

  hayFiltrosActivos(): boolean {
    return !!(
      this.filtroMes() ||
      this.filtroTipo() ||
      this.filtroMetodoPago() ||
      this.filtroManzano() ||
      this.filtroNumeroLote()
    );
  }

  cambiarOrden(columna: keyof Movimiento) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof Movimiento): string {
    if (this.sortColumn() !== columna) return 'opacity-30';
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  getTipoBadgeClass(tipo: string): string {
    const classes = {
      INGRESO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      EGRESO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[tipo as keyof typeof classes] || classes['EGRESO'];
  }

  getTotalIngresos(): number {
    return this.resumenFiltrado()?.totalIngresos ??
      this.allMovimientos().filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + Number(m.monto), 0);
  }

  getTotalEgresos(): number {
    return this.resumenFiltrado()?.totalEgresos ??
      this.allMovimientos().filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + Number(m.monto), 0);
  }

  getBalance(): number {
    return this.getTotalIngresos() - this.getTotalEgresos();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
      this.obtenerMovimientos();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
      this.obtenerMovimientos();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.obtenerMovimientos();
    }
  }

  totalPages() {
    return Math.ceil(this.total() / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.total() ? this.total() : end;
  }
}
