import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VisitaDto } from '../../../../core/interfaces/visita.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VisitaService } from '../../service/visita.service';

interface ColumnConfig {
  key: keyof VisitaDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-visita-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './visita-list.html',
})
export class VisitaList implements OnInit {
  visitas = signal<VisitaDto[]>([]);
  allVisitas = signal<VisitaDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  visitaSeleccionada = signal<VisitaDto | null>(null);
  mostrarModal = signal<boolean>(false);

  sortColumn = signal<keyof VisitaDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'asesor', label: 'Asesor', sortable: true },
    { key: 'lote', label: 'Lote', sortable: true },
    { key: 'fechaVisita', label: 'Fecha Visita', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private visitaSvc = inject(VisitaService);
  private notificationService = inject(NotificationService);

  filteredVisitas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let visitas = this.allVisitas();

    if (term) {
      visitas = visitas.filter(
        (visita: VisitaDto) =>
          visita.cliente?.fullName?.toLowerCase().includes(term) ||
          visita.asesor?.fullName?.toLowerCase().includes(term) ||
          visita.lote?.numeroLote?.toLowerCase().includes(term) ||
          visita.estado?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return visitas;

    return [...visitas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

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

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

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

  ngOnInit(): void {
    this.obtenerVisitas();
  }

  obtenerVisitas() {
    this.cargando.set(true);
    this.error.set(null);
    this.visitaSvc.getAll().subscribe({
      next: (visitas: VisitaDto[]) => {
        this.visitas.set(visitas);
        this.allVisitas.set(visitas);
        this.total.set(visitas.length);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar las visitas');
        this.cargando.set(false);
      },
    });
  }

  cambiarOrden(columna: keyof VisitaDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof VisitaDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(visita: VisitaDto) {
    this.visitaSeleccionada.set(visita);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.visitaSeleccionada.set(null);
  }

  eliminarVisita(id: number) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta visita?')
      .then((result) => {
        if (result.isConfirmed) {
          this.visitaSvc.delete(id).subscribe({
            next: (response: any) => {
              if (response.success) {
                this.visitas.update((list) => list.filter((v) => v.id !== id));
                this.allVisitas.update((list) => list.filter((v) => v.id !== id));
                this.total.update((total) => total - 1);
                this.notificationService.showSuccess('Visita eliminada correctamente');
                if (this.visitaSeleccionada()?.id === id) {
                  this.cerrarModal();
                }
              }
            },
            error: (err) => {
              this.notificationService.showError('No se pudo eliminar la visita');
            },
          });
        }
      });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      PENDIENTE: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      REALIZADA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CANCELADA: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado as keyof typeof classes] || classes['PENDIENTE'];
  }

  getEstadoText(estado: string): string {
    const estados = {
      PENDIENTE: 'Pendiente',
      REALIZADA: 'Realizada',
      CANCELADA: 'Cancelada',
    };
    return estados[estado as keyof typeof estados] || estado;
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  getVisitasPaginadas(): VisitaDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredVisitas().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }
}
