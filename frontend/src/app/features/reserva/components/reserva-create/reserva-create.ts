import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { ReservaService } from '../../service/reserva.service';
import { UserService } from '../../../users/services/users.service';
import { AuthService } from '../../../../components/services/auth.service';

interface CajaDto {
  id: number;
  nombre: string;
  saldoActual: number;
  estado: string;
}

@Component({
  selector: 'app-reserva-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reserva-create.html',
})
export class ReservaCreate implements OnInit {
  reservaForm: FormGroup;
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  cajas = signal<CajaDto[]>([]);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private reservaSvc = inject(ReservaService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  constructor() {
    this.reservaForm = this.crearFormularioReserva();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.cargarCajasActivas();
    this.establecerFechasPorDefecto();
  }

  crearFormularioReserva(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      montoReserva: [0, [Validators.required, Validators.min(0.01)]],
      fechaInicio: ['', Validators.required],
      fechaVencimiento: ['', Validators.required],
      cajaId: ['', Validators.required],
      metodoPago: ['EFECTIVO'],
      estado: ['ACTIVA'],
    });
  }

  establecerFechasPorDefecto(): void {
    const hoy = new Date();
    const vencimiento = new Date();
    vencimiento.setDate(hoy.getDate() + 30);

    const hoyFormateado = hoy.toISOString().split('T')[0];
    const vencimientoFormateado = vencimiento.toISOString().split('T')[0];

    this.reservaForm.patchValue({
      fechaInicio: hoyFormateado,
      fechaVencimiento: vencimientoFormateado,
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
        const lotesDisponibles = lotes.filter((lote) => lote.estado === 'DISPONIBLE');
        this.lotes.set(lotesDisponibles);

        if (lotesDisponibles.length === 0) {
          this.notificationService.showWarning('No se encontraron lotes disponibles para reservar');
        }
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  cargarCajasActivas(): void {
    this.reservaSvc.getCajasActivas().subscribe({
      next: (response: any) => {
        // CORREGIDO: Acceder correctamente a los datos de cajas
        if (response.success && response.data) {
          this.cajas.set(response.data);
        } else {
          this.notificationService.showWarning('No se encontraron cajas activas');
        }
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar las cajas activas');
      },
    });
  }

  filteredClientes() {
    const search = this.searchCliente().toLowerCase();
    if (!search) return this.clientes();

    return this.clientes().filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        cliente.ci?.toLowerCase().includes(search) ||
        cliente.email?.toLowerCase().includes(search)
    );
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();

    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        lote.urbanizacion?.nombre?.toLowerCase().includes(search) ||
        this.formatMonto(lote.precioBase)?.toLowerCase().includes(search)
    );
  }

  selectCliente(cliente: UserDto) {
    this.reservaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.reservaForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(
      `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatMonto(lote.precioBase)}`
    );
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

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    const fechaInicioStr = this.reservaForm.value.fechaInicio;
    const fechaVencimientoStr = this.reservaForm.value.fechaVencimiento;

    if (!fechaInicioStr || !fechaVencimientoStr) {
      this.notificationService.showError('Las fechas son requeridas');
      return;
    }

    const fechaInicio = new Date(fechaInicioStr + 'T00:00:00');
    const fechaVencimiento = new Date(fechaVencimientoStr + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaInicio < hoy) {
      this.notificationService.showError('La fecha de inicio no puede ser anterior a hoy');
      return;
    }

    if (fechaVencimiento <= fechaInicio) {
      this.notificationService.showError(
        'La fecha de vencimiento debe ser posterior a la fecha de inicio'
      );
      return;
    }

    this.enviando.set(true);

    const reservaData = {
      ...this.reservaForm.value,
      clienteId: Number(this.reservaForm.value.clienteId),
      inmuebleId: Number(this.reservaForm.value.inmuebleId),
      montoReserva: Number(this.reservaForm.value.montoReserva),
      cajaId: Number(this.reservaForm.value.cajaId),
      fechaInicio: fechaInicio.toISOString(),
      fechaVencimiento: fechaVencimiento.toISOString(),
    };

    this.reservaSvc.create(reservaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess('Reserva creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/reservas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la reserva');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);

        let errorMessage = 'Error al crear la reserva';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Recurso no encontrado. Verifique los datos ingresados.';
        } else if (err.status === 409) {
          errorMessage = 'El lote ya está reservado. Por favor seleccione otro lote.';
        } else if (err.status === 403) {
          errorMessage = 'No tiene permisos para crear reservas. Se requiere rol de ASESOR';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado] || classes['DISPONIBLE'];
  }

  formatMonto(monto: number | string | undefined | null): string {
    if (monto === undefined || monto === null) return '0';

    let numero: number;
    if (typeof monto === 'string') {
      numero = parseFloat(monto);
      if (isNaN(numero)) return '0';
    } else {
      numero = monto;
    }

    if (Number.isInteger(numero)) {
      return numero.toString();
    }

    const formatted = numero.toFixed(2);

    if (formatted.endsWith('.00')) {
      return formatted.slice(0, -3);
    }

    return formatted;
  }
}
