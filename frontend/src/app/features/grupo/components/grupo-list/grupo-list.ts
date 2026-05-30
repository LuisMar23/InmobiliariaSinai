import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GrupoService } from '../../service/grupo.service';
import { GrupoDto } from '../../../../core/interfaces/grupo.interface';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-grupo-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grupo-list.html',
  styleUrls: ['./grupo-list.css'],
})
export class GrupoList implements OnInit {
  grupos = signal<GrupoDto[]>([]);
  cargando = signal(true);
  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private grupoSvc = inject(GrupoService);
  private notify = inject(NotificationService);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.grupoSvc.getAll().subscribe({
      next: (res) => {
        this.grupos.set(res);
        this.total.set(res.length);
        this.cargando.set(false);
      },
      error: () => {
        this.notify.showError('Error al cargar grupos');
        this.cargando.set(false);
      },
    });
  }

  eliminar(id: number, tipoUsuario: string) {
    this.notify.confirmDelete(`¿Eliminar el grupo "${tipoUsuario}"?`).then((result) => {
      if (result.isConfirmed) {
        this.grupoSvc.delete(id).subscribe({
          next: () => {
            this.notify.showSuccess('Grupo eliminado');
            this.cargar();
          },
          error: () => this.notify.showError('No se pudo eliminar el grupo'),
        });
      }
    });
  }

  getGruposPaginados(): GrupoDto[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.grupos().slice(start, start + this.pageSize());
  }

  totalPages(): number {
    return Math.ceil(this.grupos().length / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    const totalFiltered = this.grupos().length;
    return end > totalFiltered ? totalFiltered : end;
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((v) => v + 1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((v) => v - 1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }
}
