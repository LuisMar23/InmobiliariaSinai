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
import { VentaDto, RegistrarPagoDto } from '../../../../core/interfaces/venta.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VentaService } from '../../service/venta.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import { ArchivosComponent } from '../../../../components/archivos/archivos/archivos';
import { environment } from '../../../../../environments/environment';
import { UploadArchivosService } from '../../../../components/services/archivos.service';
import { PdfService } from '../../../../core/services/pdf.service';

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ArchivosComponent],
  templateUrl: './venta-list.html',
})
export class VentaList implements OnInit {
  urlServer = environment.fileServer;
  ventas = signal<VentaDto[]>([]);
  allVentas = signal<VentaDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  ventaSeleccionada = signal<VentaDto | null>(null);
  mostrarModal = signal<boolean>(false);
  mostrarFormPago = signal<boolean>(false);
  enviandoPago = signal<boolean>(false);

  // Variables unificadas para manejo de archivos
  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 6;
  archivosCargando = signal<boolean>(false);
  ventaIdParaArchivos = signal<number | null>(null);
  mostrarUploader = signal(false);

  recibosVenta = signal<Recibo[]>([]);
  recibosCargando = signal<boolean>(true);

  pagoForm: FormGroup;

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  // Servicios inyectados una sola vez
  private ventaSvc = inject(VentaService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private reciboSvc = inject(ReciboService);
  private pdfService = inject(PdfService);
  private archivoService = inject(UploadArchivosService);

  constructor() {
    this.pagoForm = this.crearPagoForm();
  }

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

  crearPagoForm(): FormGroup {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];

    return this.fb.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      fecha_pago: [fechaHoy, Validators.required],
      observacion: [''],
      metodoPago: ['EFECTIVO', Validators.required],
    });
  }

  obtenerVentas() {
    this.cargando.set(true);
    this.error.set(null);
    this.ventaSvc.getAll().subscribe({
      next: (response: any) => {
        let ventas: VentaDto[] = [];

        if (response.ventas) {
          ventas = response.ventas;
          if (response.pagination) {
            this.total.set(response.pagination.total);
          } else {
            this.total.set(ventas.length);
          }
        } else if (response.data && response.data.ventas) {
          ventas = response.data.ventas;
          this.total.set(response.data.pagination?.total || ventas.length);
        } else if (Array.isArray(response)) {
          ventas = response;
          this.total.set(ventas.length);
        }

        this.ventas.set(ventas);
        this.allVentas.set(ventas);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.error.set('No se pudieron cargar las ventas');
        this.cargando.set(false);
      },
    });
  }

  cargarRecibosVenta(ventaId: number): void {
    this.recibosCargando.set(true);
    this.reciboSvc.obtenerPorVenta(ventaId).subscribe({
      next: (recibos) => {
        console.log(recibos);
        this.recibosVenta.set(recibos);
        this.recibosCargando.set(false);
      },
      error: (err) => {
        this.notificationService.showError('No se pudieron cargar los recibos de la venta');
        this.recibosCargando.set(false);
      },
    });
  }

  getTotalPagado(venta: VentaDto): number {
    if (!venta.planPago) return 0;

    if (venta.planPago.total_pagado !== undefined && venta.planPago.total_pagado !== null) {
      return Number(venta.planPago.total_pagado);
    }

    if (venta.planPago.pagos && Array.isArray(venta.planPago.pagos)) {
      return venta.planPago.pagos.reduce(
        (sum: number, pago: any) => sum + Number(pago.monto || 0),
        0
      );
    }

    return 0;
  }

  getSaldoPendiente(venta: VentaDto): number {
    if (!venta.planPago) return 0;

    if (venta.planPago.saldo_pendiente !== undefined && venta.planPago.saldo_pendiente !== null) {
      return Number(venta.planPago.saldo_pendiente);
    }

    const total = Number(venta.planPago.total || 0);
    return Math.max(0, total - this.getTotalPagado(venta));
  }

  getPorcentajePagado(venta: VentaDto): number {
    if (!venta.planPago || venta.planPago.total === 0) return 0;

    if (
      venta.planPago.porcentaje_pagado !== undefined &&
      venta.planPago.porcentaje_pagado !== null
    ) {
      return Number(venta.planPago.porcentaje_pagado);
    }

    const total = Number(venta.planPago.total || 0);
    return (this.getTotalPagado(venta) / total) * 100;
  }

  // Generar PDF de todas las ventas
  generarPdfVentas() {
    this.pdfService.generarPdfVentas(this.allVentas());
  }

  generarPdfVentaIndividual(venta: VentaDto) {
  this.pdfService.generarPdfVentaIndividual(venta);
}

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
    const totalPages = this.totalPages();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
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
    this.mostrarFormPago.set(false);
    this.pagoForm.reset();
    this.archivosSeleccionados.set([]);
    this.ventaIdParaArchivos.set(venta.id);
    this.cargarRecibosVenta(venta.id);

    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    this.pagoForm.patchValue({
      fecha_pago: fechaHoy,
      metodoPago: 'EFECTIVO',
      monto: 0,
      observacion: '',
    });
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.ventaSeleccionada.set(null);
    this.mostrarFormPago.set(false);
    this.pagoForm.reset();
    this.archivosSeleccionados.set([]);
    this.ventaIdParaArchivos.set(null);
    this.recibosVenta.set([]);
  }

  toggleFormPago(): void {
    this.mostrarFormPago.set(!this.mostrarFormPago());
  }

  getMontoMaximoPago(): number {
    const venta = this.ventaSeleccionada();
    if (!venta?.planPago) return 0;
    return this.getSaldoPendiente(venta);
  }

  registrarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const venta = this.ventaSeleccionada();
    if (!venta?.planPago) {
      this.notificationService.showError('No hay plan de pago para esta venta.');
      return;
    }

    const monto = Number(this.pagoForm.value.monto);
    const saldoPendiente = this.getSaldoPendiente(venta);

    if (monto <= 0) {
      this.notificationService.showError('El monto debe ser mayor a cero.');
      return;
    }

    if (monto > saldoPendiente) {
      this.notificationService.showError(
        `El monto no puede ser mayor al saldo pendiente (${this.formatPrecio(saldoPendiente)})`
      );
      return;
    }

    const fechaPago = new Date(this.pagoForm.value.fecha_pago);
    const hoy = new Date();
    const maxFechaPermitida = new Date(hoy);
    maxFechaPermitida.setDate(maxFechaPermitida.getDate() + 90);

    if (fechaPago > maxFechaPermitida) {
      this.notificationService.showError(
        'La fecha de pago no puede ser más de 90 días en el futuro'
      );
      return;
    }

    this.enviandoPago.set(true);

    const pagoData: RegistrarPagoDto = {
      plan_pago_id: venta.planPago.id_plan_pago!,
      monto: monto,
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion || '',
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.crearPagoPlan(pagoData).subscribe({
      next: (response: any) => {
        this.enviandoPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago registrado exitosamente!');
          this.pagoForm.reset();
          this.mostrarFormPago.set(false);

          this.obtenerVentas();

          if (venta.id) {
            this.ventaSvc.getById(venta.id).subscribe({
              next: (ventaActualizada: VentaDto) => {
                this.ventaSeleccionada.set(ventaActualizada);
                this.cargarRecibosVenta(venta.id);
              },
              error: (err) => {
                console.error('Error al actualizar venta:', err);
              },
            });
          }

          const hoy = new Date();
          const fechaHoy = hoy.toISOString().split('T')[0];
          this.pagoForm.patchValue({
            fecha_pago: fechaHoy,
            metodoPago: 'EFECTIVO',
            monto: 0,
            observacion: '',
          });
        } else {
          this.notificationService.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoPago.set(false);
        let errorMessage = 'Error al registrar el pago';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos para el pago. Verifique la fecha.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  // Métodos unificados para manejo de archivos
  abrirModalSubirArchivos(venta: VentaDto) {
    this.ventaSeleccionada.set(venta);
    this.mostrarUploader.set(true);
  }

  cerrarModalUploader() {
    this.mostrarUploader.set(false);
    this.ventaSeleccionada.set(null);
  }

  onSubidaCompleta() {
    this.cerrarModalUploader();
    this.notificationService.showSuccess('Archivos subidos correctamente');
  }

  descargarRecibo(recibo: Recibo) {
    this.reciboSvc.descargarRecibo(recibo);
  }

  eliminarRecibo(recibo: Recibo) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar este archivo?')
      .then((result) => {
        if (result.isConfirmed) {
          this.reciboSvc.eliminarRecibo(recibo.id).subscribe({
            next: () => {
              this.notificationService.showSuccess('Archivo eliminado exitosamente.');
              const ventaId = this.ventaSeleccionada()?.id;
              if (ventaId) {
                this.cargarRecibosVenta(ventaId);
              }
            },
            error: (err) => {
              this.notificationService.showError('No se pudo eliminar el archivo.');
            },
          });
        }
      });
  }

  eliminarVenta(id: number) {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length > 0) {
          const cajaId = cajas[0].id;
          this.notificationService
            .confirmDelete('¿Está seguro que desea eliminar esta venta?')
            .then((result) => {
              if (result.isConfirmed) {
                this.ventaSvc.delete(id, cajaId).subscribe({
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
                    } else if (err.error?.message) {
                      errorMessage = err.error.message;
                    }
                    this.notificationService.showError(errorMessage);
                  },
                });
              }
            });
        } else {
          this.notificationService.showError('No hay cajas activas para realizar la operación');
        }
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
      },
    });
  }

  // Métodos de utilidad
  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      PENDIENTE: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado] || classes['PENDIENTE'];
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

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatPorcentaje(porcentaje: number): string {
    return porcentaje.toFixed(1) + '%';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('es-BO');
    } catch {
      return 'N/A';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
