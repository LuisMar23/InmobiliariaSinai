import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PromocionDto } from '../../../../core/interfaces/promocion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';

interface ColumnConfig {
  key: keyof PromocionDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-promocion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './promocion-list.html',
})
export class PromocionList implements OnInit {
  promociones = signal<PromocionDto[]>([]);
  allPromociones = signal<PromocionDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  promocionSeleccionada = signal<PromocionDto | null>(null);
  mostrarModal = signal<boolean>(false);

  sortColumn = signal<keyof PromocionDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'titulo', label: 'Promoción', sortable: true },
    { key: 'descuento', label: 'Descuento', sortable: true },
    { key: 'fechaInicio', label: 'Fecha Inicio', sortable: true },
    { key: 'fechaFin', label: 'Fecha Fin', sortable: true },
    { key: 'aplicaA', label: 'Aplica a', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private promocionSvc = inject(PromocionService);
  private notificationService = inject(NotificationService);

  filteredPromociones = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let promociones = this.allPromociones();

    if (term) {
      promociones = promociones.filter(
        (promocion: PromocionDto) =>
          promocion.titulo?.toLowerCase().includes(term) ||
          promocion.descripcion?.toLowerCase().includes(term) ||
          promocion.aplicaA?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return promociones;

    return [...promociones].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (column === 'fechaInicio' || column === 'fechaFin') {
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
    this.obtenerPromociones();
  }

  obtenerPromociones() {
    this.cargando.set(true);
    this.error.set(null);
    this.promocionSvc.getAll().subscribe({
      next: (promociones) => {
        this.promociones.set(promociones);
        this.allPromociones.set(promociones);
        this.total.set(promociones.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar promociones:', err);
        this.error.set('No se pudieron cargar las promociones');
        this.cargando.set(false);
      },
    });
  }

  cambiarOrden(columna: keyof PromocionDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof PromocionDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
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
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta promoción?')
      .then((result) => {
        if (result.isConfirmed) {
          this.promocionSvc.delete(id).subscribe({
            next: () => {
              this.promociones.update((list) => list.filter((p) => p.id !== id));
              this.allPromociones.update((list) => list.filter((p) => p.id !== id));
              this.total.update((total) => total - 1);
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
      });
  }

  getAplicaABadgeClass(aplicaA: string): string {
    const classes = {
      TODOS: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      PRODUCTO: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      CATEGORIA: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
    };
    return classes[aplicaA as keyof typeof classes] || classes['TODOS'];
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

  getPromocionesPaginadas(): PromocionDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredPromociones().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }
}
