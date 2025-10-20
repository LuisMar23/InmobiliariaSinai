import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UserService } from '../../../../core/services/users.service';
import { LoteService } from '../../../lote/service/lote.service';
import { ReservaService } from '../../service/reserva.service';

@Component({
  selector: 'app-reserva-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reserva-edit.html',
})
export class ReservaEdit implements OnInit {
  reservaForm: FormGroup;
  reservaId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  reservaData: any = null;
  clientes = signal<UserDto[]>([]);
  asesores = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private reservaSvc = inject(ReservaService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  constructor() {
    this.reservaForm = this.crearFormularioReserva();
  }

  ngOnInit(): void {
    this.obtenerReserva();
  }

  crearFormularioReserva(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      asesorId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      montoReserva: [0, [Validators.required, Validators.min(0.01)]],
      fechaInicio: ['', Validators.required],
      fechaVencimiento: ['', Validators.required],
      estado: ['ACTIVA'],
    });
  }

  cargarClientes(): void {
    this.userSvc.getAll().subscribe({
      next: (response: any) => {
        let usuarios: any[] = [];

        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          usuarios = response.data;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          return;
        }

        const clientes = usuarios.filter((user: any) => {
          const rol = user.role?.toUpperCase();
          return rol === 'CLIENTE';
        });

        this.clientes.set(clientes);

        if (clientes.length === 0) {
          this.notificationService.showWarning('No se encontraron clientes registrados');
        }
      },
      error: (err: any) => {
        console.error('Error al cargar clientes:', err);
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarAsesores(): void {
    this.userSvc.getAll().subscribe({
      next: (response: any) => {
        let usuarios: any[] = [];

        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          usuarios = response.data;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          return;
        }

        const asesores = usuarios.filter((user: any) => {
          const rol = user.role?.toUpperCase();
          return rol === 'ASESOR';
        });

        this.asesores.set(asesores);

        if (asesores.length === 0) {
          this.notificationService.showWarning('No se encontraron asesores registrados');
        }
      },
      error: (err: any) => {
        console.error('Error al cargar asesores:', err);
        this.notificationService.showError('No se pudieron cargar los asesores');
      },
    });
  }

  cargarLotes(loteActualId?: number): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        // Filtra lotes DISPONIBLES y también incluye el lote actual de la reserva
        const lotesFiltrados = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.id === loteActualId
        );

        console.log('Lotes disponibles para edición:', lotesFiltrados);
        console.log('Lote actual ID:', loteActualId);
        this.lotes.set(lotesFiltrados);
      },
      error: (err: any) => {
        console.error('Error al cargar lotes:', err);
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
          console.log('Datos de la reserva cargados:', reserva);

          // Primero cargar los datos del formulario
          this.cargarDatosFormulario(reserva);

          // Luego cargar los datos adicionales (clientes, asesores, lotes)
          this.cargarDatosAdicionales(reserva);
        } else {
          this.error.set('No se encontró la reserva');
          this.cargando.set(false);
        }
      },
      error: (err: any) => {
        console.error('Error al cargar reserva:', err);
        this.error.set('No se pudo cargar la reserva');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosAdicionales(reserva: any): void {
    // Obtener el ID del lote actual
    const loteActualId = reserva.lote?.id || reserva.inmuebleId;
    console.log('Lote actual ID para filtro:', loteActualId);

    // Cargar todos los datos en paralelo
    this.cargarClientes();
    this.cargarAsesores();
    this.cargarLotes(loteActualId);

    // Marcar como cargado
    this.cargando.set(false);
  }

  cargarDatosFormulario(reserva: any): void {
    const clienteId = reserva.cliente?.id || reserva.clienteId;
    const asesorId = reserva.asesor?.id || reserva.asesorId;
    const inmuebleId = reserva.lote?.id || reserva.inmuebleId;

    console.log('Cargando datos en formulario:', {
      clienteId,
      asesorId,
      inmuebleId,
      montoReserva: reserva.montoReserva,
      fechaInicio: reserva.fechaInicio,
      fechaVencimiento: reserva.fechaVencimiento,
    });

    this.reservaForm.patchValue({
      clienteId: clienteId?.toString() || '',
      asesorId: asesorId?.toString() || '',
      inmuebleTipo: reserva.inmuebleTipo || 'LOTE',
      inmuebleId: inmuebleId?.toString() || '',
      montoReserva: reserva.montoReserva || 0,
      fechaInicio: reserva.fechaInicio ? this.formatDateForInput(reserva.fechaInicio) : '',
      fechaVencimiento: reserva.fechaVencimiento
        ? this.formatDateForInput(reserva.fechaVencimiento)
        : '',
      estado: reserva.estado || 'ACTIVA',
    });

    // Forzar la detección de cambios después de un breve delay
    setTimeout(() => {
      console.log('Formulario después del patch:', this.reservaForm.value);
    }, 100);
  }

  private formatDateForInput(date: string | Date): string {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toISOString().split('T')[0];
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
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

    // Validar fechas
    const fechaInicio = new Date(this.reservaForm.value.fechaInicio);
    const fechaVencimiento = new Date(this.reservaForm.value.fechaVencimiento);

    if (fechaInicio >= fechaVencimiento) {
      this.notificationService.showError(
        'La fecha de inicio debe ser anterior a la fecha de vencimiento.'
      );
      return;
    }

    this.enviando.set(true);

    const dataActualizada = {
      ...this.reservaForm.value,
      clienteId: Number(this.reservaForm.value.clienteId),
      asesorId: Number(this.reservaForm.value.asesorId),
      inmuebleId: Number(this.reservaForm.value.inmuebleId),
      montoReserva: Number(this.reservaForm.value.montoReserva),
    };

    console.log('Datos a actualizar:', dataActualizada);

    this.reservaSvc.update(this.reservaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
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
        console.error('Error al actualizar:', err);

        let errorMessage = 'Error al actualizar la reserva';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Reserva no encontrada.';
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

  getClienteNombre(): string {
    const clienteId = this.reservaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cliente';

    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'No encontrado';
  }

  getAsesorNombre(): string {
    const asesorId = this.reservaForm.get('asesorId')?.value;
    if (!asesorId) return 'Sin asesor';

    const asesor = this.asesores().find((a) => a.id === Number(asesorId));
    return asesor ? asesor.fullName : 'No encontrado';
  }

  // Método seguro para formatear montos
  formatMonto(monto: any): string {
    if (!monto) return '0.00';
    const montoNum = Number(monto);
    return isNaN(montoNum) ? '0.00' : montoNum.toFixed(2);
  }
}
