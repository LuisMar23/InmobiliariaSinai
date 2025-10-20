import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentaDto } from '../../../../core/interfaces/venta.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VentaService } from '../../service/venta.service';

// Interface para las columnas con tipo seguro
interface ColumnConfig {
  key: keyof VentaDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './venta-list.html',
})
export class VentaList implements OnInit {
  ventas = signal<VentaDto[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  ventaSeleccionada = signal<VentaDto | null>(null);
  mostrarModal = signal<boolean>(false);

  // Señales para ordenamiento
  sortColumn = signal<keyof VentaDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Configuración de columnas
  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'asesor', label: 'Asesor', sortable: true },
    { key: 'lote', label: 'Lote', sortable: true },
    { key: 'precioFinal', label: 'Precio Final', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  private ventaSvc = inject(VentaService);
  private notificationService = inject(NotificationService);

  // Computed para ventas ordenadas
  ventasOrdenadas = computed(() => {
    const ventas = this.ventas();
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return ventas;

    return [...ventas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Manejar valores anidados
      if (column === 'cliente') {
        aValue = a.cliente?.fullName;
        bValue = b.cliente?.fullName;
      } else if (column === 'asesor') {
        aValue = a.asesor?.fullName;
        bValue = b.asesor?.fullName;
      } else if (column === 'lote') {
        aValue = a.lote?.numeroLote;
        bValue = b.lote?.numeroLote;
      }

      // Manejar valores undefined/null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Ordenar por números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Ordenar por texto
      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  });

  ngOnInit(): void {
    this.obtenerVentas();
  }

  obtenerVentas() {
    this.cargando.set(true);
    this.error.set(null);
    this.ventaSvc.getAll().subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        this.totalPages.set(Math.ceil(ventas.length / this.pageSize()));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.error.set('No se pudieron cargar las ventas');
        this.cargando.set(false);
      },
    });
  }

  // Método para cambiar ordenamiento
  cambiarOrden(columna: keyof VentaDto) {
    if (this.sortColumn() === columna) {
      // Misma columna, cambiar dirección
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // Nueva columna, orden descendente por defecto
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  // Método para obtener clase de flecha
  getClaseFlecha(columna: keyof VentaDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPages()) {
      this.page.set(nuevaPagina);
    }
  }

  verDetalles(venta: VentaDto) {
    this.ventaSeleccionada.set(venta);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.ventaSeleccionada.set(null);
  }

  eliminarVenta(id: number) {
    if (confirm('¿Está seguro que desea eliminar esta venta?')) {
      this.ventaSvc.delete(id).subscribe({
        next: () => {
          this.ventas.update((list) => list.filter((v) => v.id !== id));
          this.notificationService.showSuccess('Venta eliminada correctamente');
          if (this.ventaSeleccionada()?.id === id) {
            this.cerrarModal();
          }
        },
        error: (err) => {
          console.error('Error al eliminar venta:', err);
          this.notificationService.showError('No se pudo eliminar la venta');
        },
      });
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      PENDIENTE_PAGO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado as keyof typeof classes] || classes['PENDIENTE_PAGO'];
  }

  getPages(): number[] {
    const pages = [];
    const startPage = Math.max(1, this.page() - 2);
    const endPage = Math.min(this.totalPages(), startPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getVentasPaginadas(): VentaDto[] {
    const startIndex = (this.page() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.ventasOrdenadas().slice(startIndex, endIndex);
  }
}
