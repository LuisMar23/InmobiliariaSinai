import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContactoService } from '../../service/contacto.service';
import { ContactoDto } from '../../../../core/interfaces/contacto.interface';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-contacto-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contacto-list.html',
  styleUrls: ['./contacto-list.css'],
})
export class ContactoList implements OnInit {
  contactos = signal<ContactoDto[]>([]);
  cargando = signal(true);
  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private contactoSvc = inject(ContactoService);
  private notify = inject(NotificationService);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.contactoSvc.getAll().subscribe({
      next: (res) => {
        this.contactos.set(res);
        this.total.set(res.length);
        this.cargando.set(false);
      },
      error: () => {
        this.notify.showError('Error al cargar contactos');
        this.cargando.set(false);
      },
    });
  }

  eliminar(id: number, nombreCompleto: string) {
    this.notify.confirmDelete(`¿Eliminar el contacto "${nombreCompleto}"?`).then((result) => {
      if (result.isConfirmed) {
        this.contactoSvc.delete(id).subscribe({
          next: () => {
            this.notify.showSuccess('Contacto eliminado');
            this.cargar();
          },
          error: () => this.notify.showError('No se pudo eliminar el contacto'),
        });
      }
    });
  }

  getContactosPaginados(): ContactoDto[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.contactos().slice(start, start + this.pageSize());
  }

  totalPages(): number {
    return Math.ceil(this.contactos().length / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    const totalFiltered = this.contactos().length;
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

  getNombreCompleto(contacto: ContactoDto): string {
    return `${contacto.firstName} ${contacto.lastName}`;
  }
}
