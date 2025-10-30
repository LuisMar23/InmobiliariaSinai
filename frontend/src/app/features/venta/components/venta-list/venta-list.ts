import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  VentaDto,
  PagoPlanDto,
  RegistrarPagoDto,
} from '../../../../core/interfaces/venta.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VentaService } from '../../service/venta.service';

// Interface para las columnas con tipo seguro
interface ColumnConfig {
  key: keyof VentaDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
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
  mostrarRegistroPago = signal<boolean>(false);
  pagoForm: FormGroup;
  procesandoPago = signal<boolean>(false);

  // Señales para ordenamiento
  sortColumn = signal<keyof VentaDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Configuración de columnas
  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'asesor', label: 'Asesor', sortable: true },
    { key: 'lote', label: 'Lote', sortable: true },
    { key: 'precioFinal', label: 'Precio Final', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private ventaSvc = inject(VentaService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  constructor() {
    this.pagoForm = this.fb.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      observacion: [''],
    });
  }

  // Computed para ventas filtradas y ordenadas
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

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return ventas;

    return [...ventas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Manejar valores anidados
      if (column === 'cliente') {
        aValue = a.cliente?.fullName;
        bValue = b.cliente?.fullName;
      } else if (column === 'asesor') {
        aValue = a.asesor?.fullName;
        bValue = b.asesor?.fullName;
      } else if (column === 'lote') {
        aValue = a.lote?.numeroLote;
        bValue = b.lote?.numeroLote;
      }

      // Manejar valores undefined/null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Ordenar por números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
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
    this.obtenerVentas();
  }

  obtenerVentas() {
    this.cargando.set(true);
    this.error.set(null);
    this.ventaSvc.getAll().subscribe({
      next: (ventas) => {
        // Agregar cálculos a cada venta
        const ventasConCalculos = ventas.map((venta) => this.agregarCalculosVenta(venta));
        this.ventas.set(ventasConCalculos);
        this.allVentas.set(ventasConCalculos);
        this.total.set(ventasConCalculos.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.error.set('No se pudieron cargar las ventas');
        this.cargando.set(false);
      },
    });
  }

  // Método para agregar cálculos a la venta
  private agregarCalculosVenta(venta: VentaDto): VentaDto {
    if (!venta.planPago) return venta;

    const totalPagado = this.calcularTotalPagado(venta.planPago.pagos || []);
    const saldoPendiente = venta.planPago.total - totalPagado;
    const porcentajePagado =
      venta.planPago.total > 0 ? (totalPagado / venta.planPago.total) * 100 : 0;

    return {
      ...venta,
      planPago: {
        ...venta.planPago,
        saldo_pendiente: saldoPendiente,
        total_pagado: totalPagado,
        porcentaje_pagado: porcentajePagado,
      },
    };
  }

  // Método para cambiar ordenamiento
  cambiarOrden(columna: keyof VentaDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  // Método para obtener clase de flecha
  getClaseFlecha(columna: keyof VentaDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
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
    return Math.ceil(this.filteredVentas().length / this.pageSize());
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

  getVentasPaginadas(): VentaDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredVentas().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1); // Resetear a primera página al buscar
  }

  verDetalles(venta: VentaDto) {
    this.ventaSeleccionada.set(venta);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.ventaSeleccionada.set(null);
    this.mostrarRegistroPago.set(false);
    this.pagoForm.reset();
  }

  mostrarFormularioPago() {
    this.mostrarRegistroPago.set(true);
    const saldoPendiente = this.getSaldoPendiente(this.ventaSeleccionada()!);
    this.pagoForm.reset({
      monto: saldoPendiente > 0 ? saldoPendiente : 0,
      observacion: '',
    });
  }

  cancelarRegistroPago() {
    this.mostrarRegistroPago.set(false);
    this.pagoForm.reset();
  }

  registrarPago() {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    const venta = this.ventaSeleccionada();
    if (!venta || !venta.planPago || !venta.planPago.id_plan_pago) {
      this.notificationService.showError('No hay plan de pago asociado a esta venta.');
      return;
    }

    const montoIngresado = this.pagoForm.value.monto;
    const saldoPendiente = this.getSaldoPendiente(venta);

    if (montoIngresado > saldoPendiente) {
      this.notificationService.showError(
        `El monto no puede ser mayor al saldo pendiente ($${saldoPendiente.toFixed(2)})`
      );
      return;
    }

    this.procesandoPago.set(true);

    const pagoData: RegistrarPagoDto = {
      plan_pago_id: venta.planPago.id_plan_pago,
      monto: montoIngresado,
      observacion: this.pagoForm.value.observacion || 'Pago adicional',
    };

    // CORREGIDO: Solo se pasa un parámetro (pagoData)
    this.ventaSvc.crearPagoPlan(pagoData).subscribe({
      next: (response: any) => {
        this.procesandoPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago registrado correctamente');
          this.obtenerVentas(); // Recargar ventas para actualizar datos
          this.mostrarRegistroPago.set(false);
          this.pagoForm.reset();

          // Actualizar los detalles de la venta en el modal
          this.ventaSvc.getById(venta.id).subscribe({
            next: (ventaActualizada) => {
              this.ventaSeleccionada.set(this.agregarCalculosVenta(ventaActualizada));
            },
          });
        } else {
          this.notificationService.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err: any) => {
        this.procesandoPago.set(false);
        console.error('Error al registrar pago:', err);
        let errorMessage = 'Error al registrar el pago';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos para el pago';
        } else if (err.status === 404) {
          errorMessage = 'Plan de pago no encontrado';
        }
        this.notificationService.showError(errorMessage);
      },
    });
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
                  'No se puede eliminar la venta porque tiene documentos o plan de pago asociados';
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

  // Métodos para calcular totales del plan de pago
  private calcularTotalPagado(pagos: PagoPlanDto[]): number {
    if (!pagos || !Array.isArray(pagos)) return 0;
    return pagos.reduce((total, pago) => total + (pago.monto || 0), 0);
  }

  getTotalPagado(venta: VentaDto): number {
    if (!venta.planPago) return 0;
    return venta.planPago.total_pagado || this.calcularTotalPagado(venta.planPago.pagos || []);
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
}
