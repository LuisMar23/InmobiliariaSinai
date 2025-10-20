import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReservaDto } from '../../../../core/interfaces/reserva.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReservaService } from '../../service/reserva.service';

// Interface para las columnas con tipo seguro
interface ColumnConfig {
  key: keyof ReservaDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-reserva-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reserva-list.html',
})
export class ReservaList implements OnInit {
  reservas = signal<ReservaDto[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  reservaSeleccionada = signal<ReservaDto | null>(null);
  mostrarModal = signal<boolean>(false);

  // Señales para ordenamiento
  sortColumn = signal<keyof ReservaDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Configuración de columnas
  columns: ColumnConfig[] = [
    { key: 'id', label: 'Reserva', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'montoReserva', label: 'Monto', sortable: true },
    { key: 'fechaInicio', label: 'Fecha Inicio', sortable: true },
    { key: 'fechaVencimiento', label: 'Fecha Vencimiento', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  private reservaSvc = inject(ReservaService);
  private notificationService = inject(NotificationService);

  // Computed para reservas ordenadas
  reservasOrdenadas = computed(() => {
    const reservas = this.reservas();
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return reservas;

    return [...reservas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Manejar valores anidados
      if (column === 'cliente') {
        aValue = a.cliente?.fullName;
        bValue = b.cliente?.fullName;
      }

      // Manejar valores undefined/null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Ordenar por números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Ordenar por fechas
      if (column === 'fechaInicio' || column === 'fechaVencimiento') {
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
    this.obtenerReservas();
  }

  obtenerReservas() {
    this.cargando.set(true);
    this.error.set(null);

    this.reservaSvc.getAll().subscribe({
      next: (reservas) => {
        console.log('Reservas cargadas:', reservas); // Para debug

        // Convertir montoReserva a número si viene como string
        const reservasConvertidas = reservas.map((reserva) => ({
          ...reserva,
          montoReserva: this.convertirANumero(reserva.montoReserva),
        }));

        this.reservas.set(reservasConvertidas);
        this.totalPages.set(Math.ceil(reservasConvertidas.length / this.pageSize()));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar reservas:', err);
        this.error.set(
          'No se pudieron cargar las reservas. Verifique la conexión con el servidor.'
        );
        this.cargando.set(false);
      },
    });
  }

  // Método para convertir a número seguro
  private convertirANumero(valor: any): number {
    if (valor === null || valor === undefined) return 0;

    const numero = Number(valor);
    return isNaN(numero) ? 0 : numero;
  }

  // Método para cambiar ordenamiento
  cambiarOrden(columna: keyof ReservaDto) {
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
  getClaseFlecha(columna: keyof ReservaDto): string {
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

  verDetalles(reserva: ReservaDto) {
    this.reservaSeleccionada.set(reserva);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.reservaSeleccionada.set(null);
  }

  eliminarReserva(id: number) {
    if (confirm('¿Está seguro que desea eliminar esta reserva?')) {
      this.reservaSvc.delete(id).subscribe({
        next: () => {
          this.reservas.update((list) => list.filter((c) => c.id !== id));
          this.notificationService.showSuccess('Reserva eliminada correctamente');
          if (this.reservaSeleccionada()?.id === id) {
            this.cerrarModal();
          }
        },
        error: (err) => {
          console.error('Error al eliminar reserva:', err);
          this.notificationService.showError('No se pudo eliminar la reserva');
        },
      });
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      ACTIVA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      VENCIDA: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CANCELADA: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
      CONVERTIDA_EN_VENTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado as keyof typeof classes] || classes['ACTIVA'];
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

  getReservasPaginadas(): ReservaDto[] {
    const startIndex = (this.page() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.reservasOrdenadas().slice(startIndex, endIndex);
  }

  // AGREGAR ESTOS MÉTODOS PARA FORMATEAR
  formatMonto(monto: any): string {
    // Convertir a número primero por si viene como string
    const montoNumerico = this.convertirANumero(monto);
    return montoNumerico.toFixed(2);
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return '';

    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
