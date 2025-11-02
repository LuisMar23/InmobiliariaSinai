import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { ArchivosComponent } from '../../../../components/archivos/archivos/archivos';

interface ColumnConfig {
  key: keyof LoteDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ArchivosComponent],
  templateUrl: './lote-list.html',
})
export class LoteList implements OnInit {
  lotes = signal<LoteDto[]>([]);
  allLotes = signal<LoteDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  loteSeleccionado = signal<LoteDto | null>(null);
  mostrarModal = signal<boolean>(false);

  sortColumn = signal<keyof LoteDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'numeroLote', label: 'Lote', sortable: true },
    { key: 'urbanizacion', label: 'Urbanización', sortable: true },
    { key: 'superficieM2', label: 'Superficie', sortable: true },
    { key: 'precioBase', label: 'Precio Base', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);

  filteredLotes = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let lotes = this.allLotes();

    if (term) {
      lotes = lotes.filter(
        (lote: LoteDto) =>
          lote.numeroLote?.toLowerCase().includes(term) ||
          lote.urbanizacion?.nombre?.toLowerCase().includes(term) ||
          lote.estado?.toLowerCase().includes(term) ||
          lote.descripcion?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return lotes;

    return [...lotes].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (column === 'urbanizacion') {
        aValue = a.urbanizacion?.nombre;
        bValue = b.urbanizacion?.nombre;
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
    this.obtenerLotes();
  }

  obtenerLotes() {
    this.cargando.set(true);
    this.error.set(null);
    this.loteSvc.getAll().subscribe({
      next: (lotes) => {
        this.lotes.set(lotes);
        this.allLotes.set(lotes);
        this.total.set(lotes.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.error.set('No se pudieron cargar los lotes');
        this.cargando.set(false);
      },
    });
  }

  cambiarOrden(columna: keyof LoteDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof LoteDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(lote: LoteDto) {
    this.loteSeleccionado.set(lote);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.loteSeleccionado.set(null);
  }

  eliminarLote(id: number) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar este lote?')
      .then((result) => {
        if (result.isConfirmed) {
          this.loteSvc.delete(id).subscribe({
            next: () => {
              this.lotes.update((list) => list.filter((l) => l.id !== id));
              this.allLotes.update((list) => list.filter((l) => l.id !== id));
              this.total.update((total) => total - 1);
              this.notificationService.showSuccess('Lote eliminado correctamente');
              if (this.loteSeleccionado()?.id === id) {
                this.cerrarModal();
              }
            },
            error: (err) => {
              console.error('Error al eliminar lote:', err);
              this.notificationService.showError('No se pudo eliminar el lote');
            },
          });
        }
      });
  }

  abrirMapa(lote: LoteDto) {
    if (lote.ubicacion) {
      window.open(lote.ubicacion, '_blank', 'noopener,noreferrer');
    } else {
      this.notificationService.showWarning('Este lote no tiene ubicación registrada');
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado as keyof typeof classes] || classes['DISPONIBLE'];
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

  getLotesPaginados(): LoteDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredLotes().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  tieneUbicacion(lote: LoteDto): boolean {
    return !!lote.ubicacion;
  }

  mostrarUploader = signal(false);
  abrirModalSubirArchivos(lote: LoteDto) {
    this.loteSeleccionado.set(lote);
    this.mostrarUploader.set(true);
  }

  cerrarModalUploader() {
    this.mostrarUploader.set(false);
    this.loteSeleccionado.set(null);
  }
  onSubidaCompleta() {
    this.cerrarModalUploader();
    this.notificationService.showSuccess('Archivos subidos correctamente');
  }
}
