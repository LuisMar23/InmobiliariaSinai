import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VentaDto } from '../../../../core/interfaces/venta.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VentaService } from '../../service/venta.service';

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venta-list.html',
})
export class VentaList implements OnInit {
  ventas = signal<VentaDto[]>([]);
  allVentas = signal<VentaDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  ventaSeleccionada = signal<VentaDto | null>(null);
  mostrarModal = signal<boolean>(false);

  // Paginación
  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private ventaSvc = inject(VentaService);
  private notificationService = inject(NotificationService);

  // Computed para ventas filtradas
  filteredVentas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let ventas = this.allVentas();

    if (term) {
      ventas = ventas.filter(
        (venta: VentaDto) =>
          venta.cliente?.fullName?.toLowerCase().includes(term) ||
          venta.asesor?.fullName?.toLowerCase().includes(term) ||
          venta.lote?.numeroLote?.toLowerCase().includes(term) ||
          venta.estado?.toLowerCase().includes(term) ||
          venta.id?.toString().includes(term)
      );
    }

    return ventas;
  });

  ngOnInit(): void {
    this.obtenerVentas();
  }

  obtenerVentas() {
    this.cargando.set(true);
    this.error.set(null);
    this.ventaSvc.getAll().subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        this.allVentas.set(ventas);
        this.total.set(ventas.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.error.set('No se pudieron cargar las ventas');
        this.cargando.set(false);
      },
    });
  }

  getTotalPagado(venta: VentaDto): number {
    if (!venta.planPago) return 0;
    return venta.planPago.total_pagado || 0;
  }

  getSaldoPendiente(venta: VentaDto): number {
    if (!venta.planPago) return 0;
    return (
      venta.planPago.saldo_pendiente ||
      Math.max(0, venta.planPago.total - this.getTotalPagado(venta))
    );
  }

  getPorcentajePagado(venta: VentaDto): number {
    if (!venta.planPago || venta.planPago.total === 0) return 0;
    return (
      venta.planPago.porcentaje_pagado || (this.getTotalPagado(venta) / venta.planPago.total) * 100
    );
  }

  // Métodos de paginación
  totalPages() {
    return Math.ceil(this.filteredVentas().length / this.pageSize());
  }

  getVentasPaginadas(): VentaDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredVentas().slice(startIndex, endIndex);
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

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.filteredVentas().length ? this.filteredVentas().length : end;
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  verDetalles(venta: VentaDto) {
    this.ventaSeleccionada.set(venta);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.ventaSeleccionada.set(null);
  }

  eliminarVenta(id: number) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta venta?')
      .then((result) => {
        if (result.isConfirmed) {
          this.ventaSvc.delete(id).subscribe({
            next: (response: any) => {
              if (response.success) {
                this.ventas.update((list) => list.filter((v) => v.id !== id));
                this.allVentas.update((list) => list.filter((v) => v.id !== id));
                this.total.update((total) => total - 1);
                this.notificationService.showSuccess('Venta eliminada correctamente');
                if (this.ventaSeleccionada()?.id === id) {
                  this.cerrarModal();
                }
              } else {
                this.notificationService.showError(
                  response.message || 'Error al eliminar la venta'
                );
              }
            },
            error: (err) => {
              console.error('Error al eliminar venta:', err);
              let errorMessage = 'No se pudo eliminar la venta';
              if (err.status === 400) {
                errorMessage =
                  err.error?.message ||
                  'No se puede eliminar la venta porque tiene documentos asociados';
              } else if (err.status === 404) {
                errorMessage = 'Venta no encontrada';
              }
              this.notificationService.showError(errorMessage);
            },
          });
        }
      });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      PENDIENTE_PAGO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado] || classes['PENDIENTE_PAGO'];
  }

  getEstadoPlanPagoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      ACTIVO: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      MOROSO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
    };
    return classes[estado] || classes['ACTIVO'];
  }
}
