// reserva-edit.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { ReservaService } from '../../service/reserva.service';
import { UserService } from '../../../users/services/users.service';
import { AuthService } from '../../../../components/services/auth.service';

@Component({
  selector: 'app-reserva-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reserva-edit.html',
  providers: [DatePipe],
})
export class ReservaEdit implements OnInit {
  reservaForm: FormGroup;
  reservaId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  reservaData: any = null;
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private reservaSvc = inject(ReservaService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);

  constructor() {
    this.reservaForm = this.crearFormularioReserva();
  }

  ngOnInit(): void {
    this.obtenerReserva();
  }

  crearFormularioReserva(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      montoReserva: [0, [Validators.required, Validators.min(0.01)]],
      fechaInicio: ['', Validators.required],
      fechaVencimiento: ['', Validators.required],
      estado: ['ACTIVA'],
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

  cargarLotes(loteActualId?: number): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        const lotesFiltrados = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.id === loteActualId
        );

        this.lotes.set(lotesFiltrados);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  obtenerReserva(): void {
    this.reservaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.reservaId) {
      this.error.set('ID de reserva no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.reservaSvc.getById(this.reservaId).subscribe({
      next: (reserva: any) => {
        if (reserva) {
          this.reservaData = reserva;
          this.cargarDatosAdicionales(reserva);
        } else {
          this.error.set('No se encontró la reserva');
          this.cargando.set(false);
        }
      },
      error: (err: any) => {
        this.error.set('No se pudo cargar la reserva');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosAdicionales(reserva: any): void {
    const loteActualId = reserva.lote?.id || reserva.inmuebleId;

    this.cargarClientes();
    this.cargarLotes(loteActualId);

    setTimeout(() => {
      this.cargarDatosFormulario(reserva);
      this.cargando.set(false);
    }, 500);
  }

  cargarDatosFormulario(reserva: any): void {
    const clienteId = reserva.cliente?.id || reserva.clienteId;
    const inmuebleId = reserva.lote?.id || reserva.inmuebleId;

    this.reservaForm.patchValue({
      clienteId: clienteId?.toString() || '',
      inmuebleTipo: reserva.inmuebleTipo || 'LOTE',
      inmuebleId: inmuebleId?.toString() || '',
      montoReserva: reserva.montoReserva || 0,
      fechaInicio: reserva.fechaInicio ? this.formatDateForInput(reserva.fechaInicio) : '',
      fechaVencimiento: reserva.fechaVencimiento
        ? this.formatDateForInput(reserva.fechaVencimiento)
        : '',
      estado: reserva.estado || 'ACTIVA',
    });

    const clienteSeleccionado = this.clientes().find((c) => c.id === clienteId);
    const loteSeleccionado = this.lotes().find((l) => l.id === inmuebleId);

    if (clienteSeleccionado) {
      this.searchCliente.set(clienteSeleccionado.fullName || '');
    }
    if (loteSeleccionado) {
      this.searchLote.set(
        `${loteSeleccionado.numeroLote} - ${
          loteSeleccionado.urbanizacion?.nombre
        } - $${this.formatMonto(loteSeleccionado.precioBase)}`
      );
    }
  }

  private formatDateForInput(date: string | Date): string {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toISOString().split('T')[0];
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

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.reservaId) {
      this.notificationService.showError('ID de reserva no válido.');
      return;
    }

    const fechaInicio = new Date(this.reservaForm.value.fechaInicio);
    const fechaVencimiento = new Date(this.reservaForm.value.fechaVencimiento);

    if (fechaInicio >= fechaVencimiento) {
      this.notificationService.showError(
        'La fecha de inicio debe ser anterior a la fecha de vencimiento.'
      );
      return;
    }

    this.enviando.set(true);

    const dataActualizada: any = {};

    if (this.reservaForm.value.clienteId)
      dataActualizada.clienteId = Number(this.reservaForm.value.clienteId);
    if (this.reservaForm.value.inmuebleId)
      dataActualizada.inmuebleId = Number(this.reservaForm.value.inmuebleId);
    if (this.reservaForm.value.montoReserva)
      dataActualizada.montoReserva = Number(this.reservaForm.value.montoReserva);
    if (this.reservaForm.value.fechaInicio)
      dataActualizada.fechaInicio = new Date(this.reservaForm.value.fechaInicio).toISOString();
    if (this.reservaForm.value.fechaVencimiento)
      dataActualizada.fechaVencimiento = new Date(
        this.reservaForm.value.fechaVencimiento
      ).toISOString();
    if (this.reservaForm.value.estado) dataActualizada.estado = this.reservaForm.value.estado;
    if (this.reservaForm.value.inmuebleTipo)
      dataActualizada.inmuebleTipo = this.reservaForm.value.inmuebleTipo;

    this.reservaSvc.update(this.reservaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess(
            response.message || 'Reserva actualizada exitosamente!'
          );
          setTimeout(() => {
            this.router.navigate(['/reservas/lista']);
          }, 1000);
        } else if (response.id) {
          this.notificationService.showSuccess('Reserva actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/reservas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar la reserva');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la reserva';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Reserva no encontrada.';
        } else if (err.status === 409) {
          errorMessage = 'El lote ya está reservado. Por favor seleccione otro lote.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/reservas/lista']);
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
