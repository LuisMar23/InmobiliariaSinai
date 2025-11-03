import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
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
  planPagoForm: FormGroup;
  pagoForm: FormGroup;

  ventaId = signal<number | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  enviandoPago = signal<boolean>(false);
  ventaData = signal<VentaDto | null>(null);

  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  mostrarFormPago = signal<boolean>(false);
  fechaVencimientoCalculada = signal<string>('');
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

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

  clienteNombre = computed(() => {
    const clienteId = this.ventaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cambios';
    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'Nuevo cliente';
  });

  loteNombre = computed(() => {
    const loteId = this.ventaForm.get('inmuebleId')?.value;
    if (!loteId) return 'Sin cambios';
    const lote = this.lotes().find((l) => l.id === Number(loteId));
    return lote ? `${lote.numeroLote} - ${lote.urbanizacion?.nombre}` : 'Nuevo lote';
  });

  periodicidadTexto = computed(() => {
    const periodicidad = this.planPagoForm.get('periodicidad')?.value;
    switch (periodicidad) {
      case 'DIAS':
        return 'días';
      case 'SEMANAS':
        return 'semanas';
      case 'MESES':
        return 'meses';
      default:
        return '';
    }
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
    this.planPagoForm = this.crearPlanPagoForm();
    this.pagoForm = this.crearPagoForm();
  }

  ngOnInit(): void {
    this.obtenerVenta();
    this.setupFormListeners();
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

  crearPlanPagoForm(): FormGroup {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    return this.fb.group({
      monto_inicial: [0, [Validators.required, Validators.min(0)]],
      plazo: [1, [Validators.required, Validators.min(1)]],
      periodicidad: ['MESES', Validators.required],
      fecha_inicio: [fechaHoy, Validators.required],
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

  setupFormListeners(): void {
    this.planPagoForm.get('fecha_inicio')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });
    this.planPagoForm.get('plazo')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });
    this.planPagoForm.get('periodicidad')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
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

    if (venta.planPago) {
      this.planPagoForm.patchValue({
        monto_inicial: venta.planPago.monto_inicial || 0,
        plazo: venta.planPago.plazo || 1,
        periodicidad: venta.planPago.periodicidad || 'MESES',
        fecha_inicio:
          this.formatDateForInput(venta.planPago.fecha_inicio) ||
          new Date().toISOString().split('T')[0],
      });

      if (venta.planPago.fecha_vencimiento) {
        this.fechaVencimientoCalculada.set(
          this.formatDateForInput(venta.planPago.fecha_vencimiento)
        );
      } else {
        this.calcularFechaVencimiento();
      }
    }
    this.cargando.set(false);
  }

  private formatDateForInput(dateString: any): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
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
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  calcularFechaVencimiento(): void {
    const fechaInicio = this.planPagoForm.get('fecha_inicio')?.value;
    const plazo = this.planPagoForm.get('plazo')?.value || 1;
    const periodicidad = this.planPagoForm.get('periodicidad')?.value;
    if (fechaInicio && plazo && periodicidad) {
      const fecha = new Date(fechaInicio);
      switch (periodicidad) {
        case 'DIAS':
          fecha.setDate(fecha.getDate() + plazo);
          break;
        case 'SEMANAS':
          fecha.setDate(fecha.getDate() + plazo * 7);
          break;
        case 'MESES':
          fecha.setMonth(fecha.getMonth() + plazo);
          break;
      }
      const fechaCalculada = fecha.toISOString().split('T')[0];
      this.fechaVencimientoCalculada.set(fechaCalculada);
    } else {
      this.fechaVencimientoCalculada.set('');
    }
  }

  actualizarPlanPago(): void {
    const id = this.ventaId();
    if (!id || this.planPagoForm.invalid) {
      this.notificationService.showError(
        'Complete todos los campos del plan de pago correctamente.'
      );
      return;
    }
    this.enviando.set(true);
    const planPagoData = {
      precioFinal: Number(this.ventaForm.value.precioFinal),
      monto_inicial: Number(this.planPagoForm.value.monto_inicial),
      plazo: Number(this.planPagoForm.value.plazo),
      periodicidad: this.planPagoForm.value.periodicidad,
      fecha_inicio: this.planPagoForm.value.fecha_inicio,
    };
    this.ventaSvc.actualizarPlanPago(id, planPagoData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Plan de pago actualizado exitosamente!');
          this.obtenerVenta();
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar el plan de pago'
          );
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error al actualizar plan de pago:', err);
        this.notificationService.showError('Error al actualizar el plan de pago');
      },
    });
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
    this.enviandoPago.set(true);
    const pagoData: RegistrarPagoDto = {
      plan_pago_id: venta.planPago.id_plan_pago!,
      monto: monto,
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion,
      metodoPago: this.pagoForm.value.metodoPago,
    };
    this.ventaSvc.crearPagoPlan(pagoData).subscribe({
      next: (response: any) => {
        this.enviandoPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago registrado exitosamente!');
          this.pagoForm.reset();
          this.mostrarFormPago.set(false);
          this.obtenerVenta();
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
          errorMessage = err.error?.message || 'Datos inválidos para el pago.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  toggleFormPago(): void {
    this.mostrarFormPago.set(!this.mostrarFormPago());
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
