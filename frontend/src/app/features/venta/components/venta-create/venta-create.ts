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
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  mostrarPlanPago = signal<boolean>(false);
  fechaVencimientoCalculada = signal<string>('');

  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.setupFormListeners();
  }

  crearFormularioVenta(): FormGroup {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];

    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE_PAGO'],
      plan_pago: this.fb.group({
        monto_inicial: [0, [Validators.required, Validators.min(0)]],
        plazo: [30, [Validators.required, Validators.min(1)]],
        periodicidad: ['DIAS', Validators.required],
        fecha_inicio: [fechaHoy, Validators.required],
      }),
    });
  }

  setupFormListeners(): void {
    // Escuchar cambios en el precio final para sincronizar con el plan de pago
    this.ventaForm.get('precioFinal')?.valueChanges.subscribe(() => {
      this.onPrecioFinalChange();
    });

    // Escuchar cambios en los campos del plan de pago para calcular fecha de vencimiento
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
        } else {
          this.notificationService.showWarning('No se pudieron cargar los clientes');
          return;
        }

        this.clientes.set(clientes);

        if (clientes.length === 0) {
          this.notificationService.showWarning('No se encontraron clientes registrados');
        }
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        const lotesDisponibles = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA'
        );
        this.lotes.set(lotesDisponibles);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  togglePlanPago(): void {
    this.mostrarPlanPago.set(!this.mostrarPlanPago());

    if (this.mostrarPlanPago()) {
      // Sincronizar automáticamente el precio final con el plan de pago
      this.onPrecioFinalChange();
      // Calcular fecha de vencimiento inicial
      this.calcularFechaVencimiento();
    }
  }

  onPrecioFinalChange(): void {
    if (this.mostrarPlanPago()) {
      const precioFinal = this.ventaForm.get('precioFinal')?.value || 0;
      const montoInicial = this.planPagoForm.get('monto_inicial')?.value || 0;

      // Validar que el monto inicial no sea mayor al precio final
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
    const precioFinal = this.ventaForm.get('precioFinal')?.value;
    return precioFinal || 0;
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

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notificationService.showError('No se pudo identificar al usuario actual');
      return;
    }

    // Validaciones del plan de pago
    if (this.mostrarPlanPago()) {
      const precioFinal = this.ventaForm.get('precioFinal')?.value;
      const montoInicial = this.planPagoForm.get('monto_inicial')?.value;

      if (montoInicial >= precioFinal) {
        this.notificationService.showError(
          'El monto inicial debe ser menor al precio final de la venta'
        );
        return;
      }

      const fechaInicio = new Date(this.planPagoForm.get('fecha_inicio')?.value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaInicio < hoy) {
        this.notificationService.showError('La fecha de inicio no puede ser en el pasado');
        return;
      }

      if (!this.fechaVencimientoCalculada()) {
        this.notificationService.showError('Error al calcular la fecha de vencimiento');
        return;
      }
    }

    this.enviando.set(true);

    const ventaData: any = {
      clienteId: Number(this.ventaForm.value.clienteId),
      asesorId: currentUser.id,
      inmuebleTipo: this.ventaForm.value.inmuebleTipo,
      inmuebleId: Number(this.ventaForm.value.inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
      estado: this.ventaForm.value.estado,
    };

    if (this.mostrarPlanPago()) {
      ventaData.plan_pago = {
        monto_inicial: Number(this.ventaForm.value.plan_pago.monto_inicial),
        plazo: Number(this.ventaForm.value.plan_pago.plazo),
        periodicidad: this.ventaForm.value.plan_pago.periodicidad,
        fecha_inicio: new Date(this.ventaForm.value.plan_pago.fecha_inicio),
      };
    }

    console.log('Datos a enviar:', ventaData);

    this.ventaSvc.create(ventaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
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
        let errorMessage = 'Error al crear la venta';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para crear ventas';
        } else if (err.status === 404) {
          errorMessage = 'Cliente o lote no encontrado';
        }
        this.notificationService.showError(errorMessage);
        console.error('Error detallado:', err);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getClienteNombre(): string {
    const clienteId = this.ventaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cliente';
    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'No encontrado';
  }

  get planPagoForm(): FormGroup {
    return this.ventaForm.get('plan_pago') as FormGroup;
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
