import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';
import {
  VentaDto,
  UpdateVentaDto,
  RegistrarPagoDto,
} from '../../../../core/interfaces/venta.interface';

@Component({
  selector: 'app-venta-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './venta-edit.html',
  providers: [DatePipe],
})
export class VentaEdit implements OnInit {
  ventaForm: FormGroup;
  pagoForm: FormGroup;

  ventaId = signal<number | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  enviandoPago = signal<boolean>(false);
  enviandoEditarPago = signal<boolean>(false);
  ventaData = signal<VentaDto | null>(null);

  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  cajas = signal<Caja[]>([]);

  mostrarFormPago = signal<boolean>(false);
  mostrarFormEditarPago = signal<boolean>(false);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

  pagoSeleccionado = signal<any>(null);

  filteredClientes = computed(() => {
    const search = this.searchCliente().toLowerCase();
    const clientes = this.clientes();
    if (!search) return clientes;
    return clientes.filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        (cliente.ci && cliente.ci.toLowerCase().includes(search)) ||
        (cliente.email && cliente.email.toLowerCase().includes(search))
    );
  });

  filteredLotes = computed(() => {
    const search = this.searchLote().toLowerCase();
    const lotes = this.lotes();
    if (!search) return lotes;
    return lotes.filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        (lote.urbanizacion?.nombre && lote.urbanizacion.nombre.toLowerCase().includes(search)) ||
        lote.precioBase?.toString().includes(search)
    );
  });

  tienePlanPago = computed(() => {
    const venta = this.ventaData();
    return !!venta?.planPago;
  });

  totalPagado = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
      return Number(planPago.total_pagado);
    }
    if (planPago.pagos && Array.isArray(planPago.pagos)) {
      return planPago.pagos.reduce((sum: number, pago: any) => sum + Number(pago.monto || 0), 0);
    }
    return 0;
  });

  saldoPendiente = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.saldo_pendiente !== undefined && planPago.saldo_pendiente !== null) {
      return Number(planPago.saldo_pendiente);
    }
    const total = Number(planPago.total || 0);
    return Math.max(0, total - this.totalPagado());
  });

  porcentajePagado = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.porcentaje_pagado !== undefined && planPago.porcentaje_pagado !== null) {
      return Number(planPago.porcentaje_pagado);
    }
    const total = Number(planPago.total || 0);
    if (total === 0) return 0;
    return (this.totalPagado() / total) * 100;
  });

  montoMaximoPago = computed(() => {
    return this.saldoPendiente();
  });

  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
    this.pagoForm = this.crearPagoForm();
  }

  ngOnInit(): void {
    this.obtenerVenta();
  }

  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
      observaciones: [''],
    });
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

  cargarClientes(): void {
    this.authService.getClientes().subscribe({
      next: (response: any) => {
        let clientes: any[] = [];
        if (response.data && Array.isArray(response.data.clientes)) {
          clientes = response.data.clientes;
        } else if (response.data && Array.isArray(response.data)) {
          clientes = response.data;
        } else if (Array.isArray(response)) {
          clientes = response;
        } else if (response.success && response.data) {
          clientes = response.data.clientes || response.data.users || response.data || [];
        }
        this.clientes.set(clientes);
        const venta = this.ventaData();
        if (venta) {
          this.setupSearchValues(venta);
        }
      },
      error: (err: any) => {
        console.error('Error cargando clientes:', err);
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        this.lotes.set(lotes);
        const venta = this.ventaData();
        if (venta) {
          this.setupSearchValues(venta);
        }
      },
      error: (err: any) => {
        console.error('Error cargando lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  selectCliente(cliente: UserDto) {
    this.ventaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.ventaForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(this.getLoteDisplayText(lote));
    this.showLotesDropdown.set(false);
  }

  getLoteDisplayText(lote: LoteDto): string {
    return `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatNumber(
      lote.precioBase
    )}`;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-BO');
  }

  toggleClientesDropdown() {
    this.showClientesDropdown.set(!this.showClientesDropdown());
    if (this.showClientesDropdown()) {
      this.showLotesDropdown.set(false);
    }
  }

  toggleLotesDropdown() {
    this.showLotesDropdown.set(!this.showLotesDropdown());
    if (this.showLotesDropdown()) {
      this.showClientesDropdown.set(false);
    }
  }

  onClienteBlur() {
    setTimeout(() => {
      this.showClientesDropdown.set(false);
    }, 200);
  }

  onLoteBlur() {
    setTimeout(() => {
      this.showLotesDropdown.set(false);
    }, 200);
  }

  obtenerVenta(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de venta no válido');
      this.cargando.set(false);
      return;
    }
    this.ventaId.set(id);
    this.cargando.set(true);
    this.ventaSvc.getById(id).subscribe({
      next: (venta: VentaDto) => {
        if (venta) {
          this.ventaData.set(venta);
          this.cargarDatosFormulario(venta);
          this.cargarClientes();
          this.cargarLotes();
        } else {
          this.error.set('No se encontró la venta');
          this.cargando.set(false);
        }
      },
      error: (err: any) => {
        console.error('Error obteniendo venta:', err);
        this.error.set('No se pudo cargar la venta');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(venta: VentaDto): void {
    this.ventaForm.patchValue({
      clienteId: venta.clienteId?.toString() || '',
      inmuebleId: venta.inmuebleId?.toString() || '',
      precioFinal: venta.precioFinal || 0,
      estado: venta.estado || 'PENDIENTE',
      observaciones: venta.observaciones || '',
    });
    this.cargando.set(false);
  }

  setupSearchValues(venta: VentaDto): void {
    const cliente = this.clientes().find((c) => c.id === venta.clienteId);
    if (cliente) {
      this.searchCliente.set(cliente.fullName || '');
    }
    const lote = this.lotes().find((l) => l.id === venta.inmuebleId);
    if (lote) {
      this.searchLote.set(this.getLoteDisplayText(lote));
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  editarPago(pago: any): void {
    this.pagoSeleccionado.set(pago);
    this.mostrarFormEditarPago.set(true);
    this.mostrarFormPago.set(false);

    const fechaPago = pago.fecha_pago ? new Date(pago.fecha_pago) : new Date();
    const fechaFormateada = fechaPago.toISOString().split('T')[0];

    this.pagoForm.patchValue({
      monto: pago.monto,
      fecha_pago: fechaFormateada,
      observacion: pago.observacion || '',
      metodoPago: pago.metodoPago || 'EFECTIVO',
    });
  }

  actualizarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const pagoId = this.pagoSeleccionado()?.id_pago_plan;
    if (!pagoId) {
      this.notificationService.showError('No se ha seleccionado un pago para editar.');
      return;
    }

    this.enviandoEditarPago.set(true);
    const updateData = {
      monto: Number(this.pagoForm.value.monto),
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion,
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.actualizarPagoPlan(pagoId, updateData).subscribe({
      next: (response: any) => {
        this.enviandoEditarPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago actualizado exitosamente!');
          this.cancelarEdicionPago();
          this.obtenerVenta();
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoEditarPago.set(false);
        console.error('Error al actualizar pago:', err);
        let errorMessage = 'Error al actualizar el pago';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos para el pago. Verifique la fecha.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarPago(pago: any): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.notificationService.showError('No hay cajas disponibles para realizar la operación');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Está seguro que desea eliminar este pago?')
          .then((result) => {
            if (result.isConfirmed) {
              this.ventaSvc.eliminarPagoPlan(pago.id_pago_plan, cajaId).subscribe({
                next: (response: any) => {
                  if (response.success) {
                    this.notificationService.showSuccess('Pago eliminado exitosamente!');
                    this.obtenerVenta();
                  } else {
                    this.notificationService.showError(
                      response.message || 'Error al eliminar el pago'
                    );
                  }
                },
                error: (err: any) => {
                  console.error('Error al eliminar pago:', err);
                  this.notificationService.showError('Error al eliminar el pago');
                },
              });
            }
          });
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
      },
    });
  }

  registrarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const venta = this.ventaData();
    if (!venta?.planPago) {
      this.notificationService.showError('No hay plan de pago para esta venta.');
      return;
    }

    const monto = Number(this.pagoForm.value.monto);
    const saldoPendiente = this.saldoPendiente();

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
          this.cancelarEdicionPago();
          this.obtenerVenta();
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

  cancelarEdicionPago(): void {
    this.mostrarFormPago.set(false);
    this.mostrarFormEditarPago.set(false);
    this.pagoSeleccionado.set(null);

    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    this.pagoForm.patchValue({
      fecha_pago: fechaHoy,
      metodoPago: 'EFECTIVO',
      monto: 0,
      observacion: '',
    });
  }

  toggleFormPago(): void {
    this.mostrarFormPago.set(!this.mostrarFormPago());
    this.mostrarFormEditarPago.set(false);
    this.pagoSeleccionado.set(null);

    if (this.mostrarFormPago()) {
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];
      this.pagoForm.patchValue({
        fecha_pago: fechaHoy,
        metodoPago: 'EFECTIVO',
        monto: 0,
        observacion: '',
      });
    }
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }
    const id = this.ventaId();
    if (!id) {
      this.notificationService.showError('ID de venta no válido.');
      return;
    }
    const clienteId = this.ventaForm.get('clienteId')?.value;
    const inmuebleId = this.ventaForm.get('inmuebleId')?.value;
    if (!clienteId || !inmuebleId) {
      this.notificationService.showError('Debe seleccionar un cliente y un lote');
      return;
    }
    this.enviando.set(true);
    const ventaActual = this.ventaData();
    const dataActualizada: UpdateVentaDto = {};
    if (Number(clienteId) !== ventaActual?.clienteId) {
      dataActualizada.clienteId = Number(clienteId);
    }
    if (Number(inmuebleId) !== ventaActual?.inmuebleId) {
      dataActualizada.inmuebleTipo = 'LOTE';
      dataActualizada.inmuebleId = Number(inmuebleId);
    }
    if (Number(this.ventaForm.value.precioFinal) !== ventaActual?.precioFinal) {
      dataActualizada.precioFinal = Number(this.ventaForm.value.precioFinal);
    }
    if (this.ventaForm.value.estado !== ventaActual?.estado) {
      dataActualizada.estado = this.ventaForm.value.estado;
    }
    if (this.ventaForm.value.observaciones !== ventaActual?.observaciones) {
      dataActualizada.observaciones = this.ventaForm.value.observaciones;
    }
    if (Object.keys(dataActualizada).length === 0) {
      this.notificationService.showInfo('No se detectaron cambios para actualizar.');
      this.enviando.set(false);
      return;
    }
    this.ventaSvc.update(id, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Venta actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/ventas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la venta';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Venta no encontrada.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarVenta(): void {
    const id = this.ventaId();
    if (!id) return;

    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.notificationService.showError('No hay cajas disponibles para realizar la operación');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Está seguro que desea eliminar esta venta?')
          .then((result) => {
            if (result.isConfirmed) {
              this.ventaSvc.delete(id, cajaId).subscribe({
                next: (response: any) => {
                  if (response.success) {
                    this.notificationService.showSuccess('Venta eliminada correctamente');
                    this.router.navigate(['/ventas/lista']);
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
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/ventas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

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
}
