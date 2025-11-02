import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';

@Component({
  selector: 'app-venta-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './venta-create.html',
})
export class VentaCreate implements OnInit {
  ventaForm: FormGroup;
  planPagoForm: FormGroup;
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  mostrarPlanPago = signal<boolean>(true);
  fechaVencimientoCalculada = signal<string>('');

  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

  authService = inject(AuthService);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
    this.planPagoForm = this.crearPlanPagoForm();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
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
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() + 1);

    return this.fb.group({
      monto_inicial: [0, [Validators.required, Validators.min(0)]],
      plazo: [12, [Validators.required, Validators.min(1)]],
      periodicidad: ['MESES', Validators.required],
      fecha_inicio: [fechaInicio.toISOString().split('T')[0], Validators.required],
    });
  }

  setupFormListeners(): void {
    this.ventaForm.get('precioFinal')?.valueChanges.subscribe(() => {
      this.onPrecioFinalChange();
    });

    this.planPagoForm.get('fecha_inicio')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    this.planPagoForm.get('plazo')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    this.planPagoForm.get('periodicidad')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    setTimeout(() => {
      this.calcularFechaVencimiento();
    }, 100);
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

        console.log('Clientes cargados:', clientes);
        this.clientes.set(clientes);
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
        console.log('Lotes cargados:', lotes);
        const lotesDisponibles = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA'
        );
        this.lotes.set(lotesDisponibles);
      },
      error: (err: any) => {
        console.error('Error cargando lotes:', err);
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
        (cliente.ci && cliente.ci.toLowerCase().includes(search)) ||
        (cliente.email && cliente.email.toLowerCase().includes(search))
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
    console.log('Cliente seleccionado:', cliente);
    this.ventaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    console.log('Lote seleccionado:', lote);
    this.ventaForm.patchValue({
      inmuebleId: lote.id.toString(),
      precioFinal: lote.precioBase,
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

  togglePlanPago(): void {
    this.mostrarPlanPago.set(!this.mostrarPlanPago());
    if (this.mostrarPlanPago()) {
      this.onPrecioFinalChange();
      this.calcularFechaVencimiento();
    }
  }

  onPrecioFinalChange(): void {
    if (this.mostrarPlanPago()) {
      const precioFinal = this.ventaForm.get('precioFinal')?.value || 0;
      const montoInicial = this.planPagoForm.get('monto_inicial')?.value || 0;
      if (montoInicial > precioFinal) {
        this.planPagoForm.get('monto_inicial')?.setValue(precioFinal);
      }
    }
  }

  calcularFechaVencimiento(): void {
    if (!this.mostrarPlanPago()) return;

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
      this.fechaVencimientoCalculada.set(fecha.toISOString().split('T')[0]);
    } else {
      this.fechaVencimientoCalculada.set('');
    }
  }

  getMontoMaximoInicial(): number {
    return this.ventaForm.get('precioFinal')?.value || 0;
  }

  getSaldoFinanciar(): number {
    if (!this.mostrarPlanPago()) return 0;
    const precioFinal = this.ventaForm.get('precioFinal')?.value || 0;
    const montoInicial = this.planPagoForm.get('monto_inicial')?.value || 0;
    return Math.max(0, precioFinal - montoInicial);
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (this.mostrarPlanPago() && this.planPagoForm.invalid) {
      this.planPagoForm.markAllAsTouched();
      this.notificationService.showError(
        'Complete todos los campos del plan de pago correctamente.'
      );
      return;
    }

    const clienteId = this.ventaForm.get('clienteId')?.value;
    const inmuebleId = this.ventaForm.get('inmuebleId')?.value;

    if (!clienteId || !inmuebleId) {
      this.notificationService.showError('Debe seleccionar un cliente y un lote');
      return;
    }

    this.enviando.set(true);

    const ventaData: any = {
      clienteId: Number(clienteId),
      inmuebleTipo: 'LOTE',
      inmuebleId: Number(inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
      estado: this.ventaForm.value.estado,
      observaciones: this.ventaForm.value.observaciones,
    };

    if (this.mostrarPlanPago()) {
      const precioFinal = this.ventaForm.get('precioFinal')?.value;
      const montoInicial = this.planPagoForm.get('monto_inicial')?.value;

      if (montoInicial > precioFinal) {
        this.notificationService.showError(
          'El monto inicial no puede ser mayor al precio final de la venta'
        );
        this.enviando.set(false);
        return;
      }

      ventaData.plan_pago = {
        monto_inicial: Number(this.planPagoForm.value.monto_inicial),
        plazo: Number(this.planPagoForm.value.plazo),
        periodicidad: this.planPagoForm.value.periodicidad,
        fecha_inicio: this.planPagoForm.value.fecha_inicio,
      };
    } else {
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];

      ventaData.plan_pago = {
        monto_inicial: 0,
        plazo: 1,
        periodicidad: 'MESES',
        fecha_inicio: fechaHoy,
      };
    }

    console.log('Enviando datos de venta:', ventaData);

    this.ventaSvc.create(ventaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          this.notificationService.showSuccess('Venta creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/ventas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error completo:', err);

        let errorMessage = 'Error al crear la venta';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para crear ventas';
        } else if (err.status === 404) {
          errorMessage = 'Cliente o lote no encontrado';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
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

  debugForm(): void {
    console.log('Venta Form:', this.ventaForm.value);
    console.log('Plan Pago Form:', this.planPagoForm.value);
    console.log('Clientes:', this.clientes());
    console.log('Lotes:', this.lotes());
  }
}
