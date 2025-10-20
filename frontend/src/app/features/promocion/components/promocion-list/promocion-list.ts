import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PromocionDto } from '../../../../core/interfaces/promocion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';

// Interface para las columnas con tipo seguro
interface ColumnConfig {
  key: keyof PromocionDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-promocion-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './promocion-list.html',
})
export class PromocionList implements OnInit {
  promociones = signal<PromocionDto[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  promocionSeleccionada = signal<PromocionDto | null>(null);
  mostrarModal = signal<boolean>(false);

  // Señales para ordenamiento
  sortColumn = signal<keyof PromocionDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Configuración de columnas
  columns: ColumnConfig[] = [
    { key: 'titulo', label: 'Promoción', sortable: true },
    { key: 'descuento', label: 'Descuento', sortable: true },
    { key: 'fechaInicio', label: 'Fecha Inicio', sortable: true },
    { key: 'fechaFin', label: 'Fecha Fin', sortable: true },
    { key: 'aplicaA', label: 'Aplica a', sortable: true },
  ];

  private promocionSvc = inject(PromocionService);
  private notificationService = inject(NotificationService);

  // Computed para promociones ordenadas
  promocionesOrdenadas = computed(() => {
    const promociones = this.promociones();
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return promociones;

    return [...promociones].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Manejar valores undefined/null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Ordenar por números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Ordenar por fechas
      if (column === 'fechaInicio' || column === 'fechaFin') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
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
    this.obtenerPromociones();
  }

  obtenerPromociones() {
    this.cargando.set(true);
    this.error.set(null);
    this.promocionSvc.getAll().subscribe({
      next: (promociones) => {
        this.promociones.set(promociones);
        this.totalPages.set(Math.ceil(promociones.length / this.pageSize()));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar promociones:', err);
        this.error.set('No se pudieron cargar las promociones');
        this.cargando.set(false);
      },
    });
  }

  // Método para cambiar ordenamiento
  cambiarOrden(columna: keyof PromocionDto) {
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
  getClaseFlecha(columna: keyof PromocionDto): string {
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

  verDetalles(promocion: PromocionDto) {
    this.promocionSeleccionada.set(promocion);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.promocionSeleccionada.set(null);
  }

  eliminarPromocion(id: number) {
    if (confirm('¿Está seguro que desea eliminar esta promoción?')) {
      this.promocionSvc.delete(id).subscribe({
        next: () => {
          this.promociones.update((list) => list.filter((p) => p.id !== id));
          this.notificationService.showSuccess('Promoción eliminada correctamente');
          if (this.promocionSeleccionada()?.id === id) {
            this.cerrarModal();
          }
        },
        error: (err) => {
          console.error('Error al eliminar promoción:', err);
          this.notificationService.showError('No se pudo eliminar la promoción');
        },
      });
    }
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

  getPromocionesPaginadas(): PromocionDto[] {
    const startIndex = (this.page() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.promocionesOrdenadas().slice(startIndex, endIndex);
  }
}
