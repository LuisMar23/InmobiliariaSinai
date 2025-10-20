import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CotizacionDto } from '../../../../core/interfaces/cotizacion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { CotizacionService } from '../../service/cotizacion.service';

// Interface para las columnas con tipo seguro
interface ColumnConfig {
  key: keyof CotizacionDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-cotizacion-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cotizacion-list.html',
})
export class CotizacionList implements OnInit {
  cotizaciones = signal<CotizacionDto[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  cotizacionSeleccionada = signal<CotizacionDto | null>(null);
  mostrarModal = signal<boolean>(false);

  // Señales para ordenamiento
  sortColumn = signal<keyof CotizacionDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Configuración de columnas
  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'asesor', label: 'Asesor', sortable: true },
    { key: 'lote', label: 'Lote', sortable: true },
    { key: 'precioOfertado', label: 'Precio Ofertado', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  private cotizacionSvc = inject(CotizacionService);
  private notificationService = inject(NotificationService);

  // Computed para cotizaciones ordenadas
  cotizacionesOrdenadas = computed(() => {
    const cotizaciones = this.cotizaciones();
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return cotizaciones;

    return [...cotizaciones].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Manejar valores anidados
      if (column === 'cliente') {
        aValue = a.cliente?.fullName;
        bValue = b.cliente?.fullName;
      }
      if (column === 'asesor') {
        aValue = a.asesor?.fullName;
        bValue = b.asesor?.fullName;
      }
      if (column === 'lote') {
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
    this.obtenerCotizaciones();
  }

  obtenerCotizaciones() {
    this.cargando.set(true);
    this.error.set(null);
    this.cotizacionSvc.getAll().subscribe({
      next: (cotizaciones) => {
        this.cotizaciones.set(cotizaciones);
        this.totalPages.set(Math.ceil(cotizaciones.length / this.pageSize()));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar cotizaciones:', err);
        this.error.set('No se pudieron cargar las cotizaciones');
        this.cargando.set(false);
      },
    });
  }

  // Método para cambiar ordenamiento
  cambiarOrden(columna: keyof CotizacionDto) {
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
  getClaseFlecha(columna: keyof CotizacionDto): string {
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

  verDetalles(cotizacion: CotizacionDto) {
    this.cotizacionSeleccionada.set(cotizacion);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.cotizacionSeleccionada.set(null);
  }

  eliminarCotizacion(id: number) {
    if (confirm('¿Está seguro que desea eliminar esta cotización?')) {
      this.cotizacionSvc.delete(id).subscribe({
        next: () => {
          this.cotizaciones.update((list) => list.filter((c) => c.id !== id));
          this.notificationService.showSuccess('Cotización eliminada correctamente');
          if (this.cotizacionSeleccionada()?.id === id) {
            this.cerrarModal();
          }
        },
        error: (err) => {
          console.error('Error al eliminar cotización:', err);
          this.notificationService.showError('No se pudo eliminar la cotización');
        },
      });
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      PENDIENTE: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      ACEPTADA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RECHAZADA: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado as keyof typeof classes] || classes['PENDIENTE'];
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

  getCotizacionesPaginadas(): CotizacionDto[] {
    const startIndex = (this.page() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.cotizacionesOrdenadas().slice(startIndex, endIndex);
  }
}
