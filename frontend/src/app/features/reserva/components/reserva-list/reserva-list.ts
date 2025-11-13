// reserva-list.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservaDto } from '../../../../core/interfaces/reserva.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReservaService } from '../../service/reserva.service';

interface ColumnConfig {
  key: keyof ReservaDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-reserva-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reserva-list.html',
})
export class ReservaList implements OnInit {
  reservas = signal<ReservaDto[]>([]);
  allReservas = signal<ReservaDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  reservaSeleccionada = signal<ReservaDto | null>(null);
  mostrarModal = signal<boolean>(false);

  sortColumn = signal<keyof ReservaDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'id', label: 'Reserva', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'montoReserva', label: 'Monto', sortable: true },
    { key: 'fechaInicio', label: 'Fecha Inicio', sortable: true },
    { key: 'fechaVencimiento', label: 'Fecha Vencimiento', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private reservaSvc = inject(ReservaService);
  private notificationService = inject(NotificationService);

  filteredReservas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let reservas = this.allReservas();

    if (term) {
      reservas = reservas.filter(
        (reserva: ReservaDto) =>
          reserva.cliente?.fullName?.toLowerCase().includes(term) ||
          reserva.asesor?.fullName?.toLowerCase().includes(term) ||
          reserva.lote?.numeroLote?.toLowerCase().includes(term) ||
          reserva.estado?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return reservas;

    return [...reservas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (column === 'cliente') {
        aValue = a.cliente?.fullName;
        bValue = b.cliente?.fullName;
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (column === 'fechaInicio' || column === 'fechaVencimiento') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
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

  ngOnInit(): void {
    this.obtenerReservas();
  }

  obtenerReservas() {
    this.cargando.set(true);
    this.error.set(null);

    this.reservaSvc.getAll().subscribe({
      next: (reservas) => {
        const reservasConvertidas = reservas.map((reserva) => ({
          ...reserva,
          montoReserva: this.convertirANumero(reserva.montoReserva),
        }));

        this.reservas.set(reservasConvertidas);
        this.allReservas.set(reservasConvertidas);
        this.total.set(reservasConvertidas.length);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar las reservas');
        this.cargando.set(false);
      },
    });
  }

  private convertirANumero(valor: any): number {
    if (valor === null || valor === undefined) return 0;
    const numero = Number(valor);
    return isNaN(numero) ? 0 : numero;
  }

  cambiarOrden(columna: keyof ReservaDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof ReservaDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
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
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta reserva?')
      .then((result) => {
        if (result.isConfirmed) {
          this.reservaSvc.delete(id).subscribe({
            next: () => {
              this.reservas.update((list) => list.filter((r) => r.id !== id));
              this.allReservas.update((list) => list.filter((r) => r.id !== id));
              this.total.update((total) => total - 1);
              this.notificationService.showSuccess('Reserva eliminada correctamente');
              if (this.reservaSeleccionada()?.id === id) {
                this.cerrarModal();
              }
            },
            error: (err) => {
              this.notificationService.showError('No se pudo eliminar la reserva');
            },
          });
        }
      });
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

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
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

  getReservasPaginadas(): ReservaDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredReservas().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  formatMonto(monto: any): string {
    const montoNumerico = this.convertirANumero(monto);

    if (Number.isInteger(montoNumerico)) {
      return montoNumerico.toString();
    }

    const formatted = montoNumerico.toFixed(2);

    if (formatted.endsWith('.00')) {
      return formatted.slice(0, -3);
    }

    return formatted;
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
