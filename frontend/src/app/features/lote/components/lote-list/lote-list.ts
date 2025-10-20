import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lote-list.html',
})
export class LoteList implements OnInit {
  lotes = signal<LoteDto[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  loteSeleccionado = signal<LoteDto | null>(null);
  mostrarModal = signal<boolean>(false);

  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.obtenerLotes();
  }

  obtenerLotes() {
    this.cargando.set(true);
    this.error.set(null);
    this.loteSvc.getAll().subscribe({
      next: (lotes) => {
        this.lotes.set(lotes);
        this.totalPages.set(Math.ceil(lotes.length / this.pageSize()));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.error.set('No se pudieron cargar los lotes');
        this.cargando.set(false);
      },
    });
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPages()) {
      this.page.set(nuevaPagina);
    }
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
    if (confirm('¿Está seguro que desea eliminar este lote?')) {
      this.loteSvc.delete(id).subscribe({
        next: () => {
          this.lotes.update((list) => list.filter((l) => l.id !== id));
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

  getPages(): number[] {
    const pages = [];
    const startPage = Math.max(1, this.page() - 2);
    const endPage = Math.min(this.totalPages(), startPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getLotesPaginados(): LoteDto[] {
    const startIndex = (this.page() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.lotes().slice(startIndex, endIndex);
  }
}
