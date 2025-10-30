import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Movimiento } from '../../../../core/interfaces/caja.interface';
import { MovimientoService } from '../../service/movimiento.service';

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

  movimientos = signal<Movimiento[]>([]);
  allMovimientos = signal<Movimiento[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  cajaId = signal<number>(0);

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
          movimiento.fecha.toLowerCase().includes(term)
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

      if (direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  });

  resumenCaja = signal<any>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.cajaId.set(id);
      if (id) {
        this.obtenerMovimientos();
        this.obtenerTotales();
        this.obtenerResumenCaja();
      }
    });
  }

  obtenerMovimientos() {
    this.cargando.set(true);
    this.error.set(null);

    this.movSvc.loadByCaja(this.cajaId(), this.currentPage(), this.pageSize());

    // Simular carga de datos
    setTimeout(() => {
      this.movimientos.set(this.movSvc.movimientos());
      this.allMovimientos.set(this.movSvc.movimientos());
      this.total.set(this.movSvc.total());
      this.cargando.set(false);
    }, 1000);
  }

  obtenerTotales() {
    this.movSvc.loadTotales(this.cajaId());
  }

  obtenerResumenCaja() {
    this.movSvc.getResumenCaja(this.cajaId()).subscribe({
      next: (resumen) => {
        this.resumenCaja.set(resumen);
      },
      error: (err) => {
        console.error('Error al obtener resumen:', err);
      },
    });
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
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
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
    return this.movimientos()
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);
  }

  getTotalEgresos(): number {
    return this.movimientos()
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);
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
