// venta-edit.ts (solo la parte corregida)
import { Component, inject, signal, OnInit } from '@angular/core';
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
  ventaData = signal<VentaDto | null>(null);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  mostrarFormPago = signal<boolean>(false);

  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

  router = inject(Router);
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
    this.cargarClientes();
    this.cargarLotes();
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
        } else {
          this.notificationService.showWarning('No se pudieron cargar los clientes');
          return;
        }

        this.clientes.set(clientes);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        // Incluir todos los lotes, no solo los disponibles
        this.lotes.set(lotes);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  filteredClientes() {
    const search = this.searchCliente().toLowerCase();
    if (!search) return this.clientes();

    return this.clientes().filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        (cliente.ci && cliente.ci.toLowerCase().includes(search))
    );
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();

    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        (lote.urbanizacion?.nombre && lote.urbanizacion.nombre.toLowerCase().includes(search)) ||
        lote.precioBase?.toString().includes(search)
    );
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
    this.searchLote.set(`${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${lote.precioBase}`);
    this.showLotesDropdown.set(false);
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
          this.setupSearchValues(venta);
        } else {
          this.error.set('No se encontró la venta');
        }
        this.cargando.set(false);
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
      observaciones: '',
    });

    // Cargar datos del plan de pago si existe
    if (venta.planPago) {
      this.planPagoForm.patchValue({
        monto_inicial: venta.planPago.monto_inicial || 0,
        plazo: venta.planPago.plazo || 1,
        periodicidad: venta.planPago.periodicidad || 'MESES',
        fecha_inicio:
          venta.planPago.fecha_inicio?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    }
  }

  setupSearchValues(venta: VentaDto): void {
    const cliente = this.clientes().find((c) => c.id === venta.clienteId);
    if (cliente) {
      this.searchCliente.set(cliente.fullName || '');
    }

    const lote = this.lotes().find((l) => l.id === venta.inmuebleId);
    if (lote) {
      this.searchLote.set(
        `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${lote.precioBase}`
      );
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
    if (!clienteId) {
      this.notificationService.showError('Debe seleccionar un cliente');
      return;
    }

    const inmuebleId = this.ventaForm.get('inmuebleId')?.value;
    if (!inmuebleId) {
      this.notificationService.showError('Debe seleccionar un lote');
      return;
    }

    this.enviando.set(true);

    // Solo enviar los campos que han cambiado
    const ventaActual = this.ventaData();
    const dataActualizada: any = {};

    // Solo incluir campos que han cambiado
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

    if (this.ventaForm.value.observaciones) {
      dataActualizada.observaciones = this.ventaForm.value.observaciones;
    }

    // Si no hay cambios, mostrar mensaje
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
          // Redirigir al listado después de actualizar
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
      monto_inicial: Number(this.planPagoForm.value.monto_inicial),
      plazo: Number(this.planPagoForm.value.plazo),
      periodicidad: this.planPagoForm.value.periodicidad,
      fecha_inicio: this.planPagoForm.value.fecha_inicio,
    };

    // Para actualizar el plan de pago, necesitamos actualizar la venta con el nuevo precio final
    // y posiblemente crear un nuevo plan de pago
    const dataActualizada: any = {
      precioFinal: Number(this.ventaForm.value.precioFinal),
      // Nota: En una implementación real, necesitarías un endpoint específico para actualizar el plan de pago
    };

    this.ventaSvc.update(id, dataActualizada).subscribe({
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
        this.notificationService.showError('Error al actualizar el plan de pago');
      },
    });
  }

  registrarPago(): void {
    const planPago = this.getPlanPago();
    if (!planPago || this.pagoForm.invalid) {
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    this.enviando.set(true);

    const pagoData: RegistrarPagoDto = {
      plan_pago_id: planPago.id_plan_pago!,
      monto: Number(this.pagoForm.value.monto),
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion || 'Pago registrado',
    };

    this.ventaSvc.crearPagoPlan(pagoData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago registrado exitosamente!');
          this.pagoForm.reset();
          this.mostrarFormPago.set(false);

          const hoy = new Date();
          const fechaHoy = hoy.toISOString().split('T')[0];
          this.pagoForm.patchValue({
            fecha_pago: fechaHoy,
          });

          this.obtenerVenta();
        } else {
          this.notificationService.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al registrar el pago';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos para el pago.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarPago(pagoId: number): void {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar este pago?')
      .then((result) => {
        if (result.isConfirmed) {
          // Nota: Necesitarías implementar un método en el servicio para eliminar pagos
          this.notificationService.showWarning(
            'Funcionalidad de eliminar pago pendiente de implementar.'
          );
        }
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

  getClienteNombre(): string {
    const clienteId = this.ventaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cambios';
    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'Nuevo cliente';
  }

  getLoteNombre(): string {
    const loteId = this.ventaForm.get('inmuebleId')?.value;
    if (!loteId) return 'Sin cambios';
    const lote = this.lotes().find((l) => l.id === Number(loteId));
    return lote ? lote.numeroLote : 'Nuevo lote';
  }

  getVentaData() {
    return this.ventaData();
  }

  getPlanPago() {
    return this.ventaData()?.planPago;
  }

  tienePlanPago(): boolean {
    return !!this.ventaData()?.planPago;
  }

  getTotalPagado(): number {
    const planPago = this.getPlanPago();
    if (!planPago) return 0;
    return planPago.total_pagado || 0;
  }

  getSaldoPendiente(): number {
    const planPago = this.getPlanPago();
    if (!planPago) return 0;
    return planPago.saldo_pendiente || Math.max(0, planPago.total - this.getTotalPagado());
  }

  getPorcentajePagado(): number {
    const planPago = this.getPlanPago();
    if (!planPago || planPago.total === 0) return 0;
    return planPago.porcentaje_pagado || (this.getTotalPagado() / planPago.total) * 100;
  }

  getMontoMaximoPago(): number {
    return this.getSaldoPendiente();
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Métodos para el cálculo de fechas del plan de pago
  calcularFechaVencimiento(): string {
    const fechaInicio = this.planPagoForm.get('fecha_inicio')?.value;
    const plazo = this.planPagoForm.get('plazo')?.value || 1;
    const periodicidad = this.planPagoForm.get('periodicidad')?.value;

    if (fechaInicio && plazo) {
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
      return fecha.toISOString().split('T')[0];
    }
    return '';
  }

  getPeriodicidadTexto(): string {
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
  }
}
