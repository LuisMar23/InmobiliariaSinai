import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UserService } from '../../../../core/services/users.service';
import { LoteService } from '../../../lote/service/lote.service';
import { ReservaService } from '../../service/reserva.service';

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
  asesores = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private reservaSvc = inject(ReservaService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.reservaForm = this.crearFormularioReserva();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarAsesores();
    this.cargarLotes();
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
        console.log('Respuesta completa de usuarios:', response);

        let usuarios: any[] = [];

        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          usuarios = response.data;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          return;
        }

        console.log('Usuarios obtenidos:', usuarios);

        const clientes = usuarios.filter((user: any) => {
          const rol = user.role?.toUpperCase();
          console.log(`Usuario: ${user.fullName}, Rol: ${rol}`);
          return rol === 'CLIENTE';
        });

        console.log('Clientes filtrados:', clientes);
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
        console.log('Respuesta completa de usuarios:', response);

        let usuarios: any[] = [];

        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          usuarios = response.data;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          return;
        }

        console.log('Usuarios obtenidos:', usuarios);

        const asesores = usuarios.filter((user: any) => {
          const rol = user.role?.toUpperCase();
          console.log(`Usuario: ${user.fullName}, Rol: ${rol}`);
          return rol === 'ASESOR';
        });

        console.log('Asesores filtrados:', asesores);
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

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        // Filtra solo lotes DISPONIBLES
        const lotesDisponibles = lotes.filter((lote) => lote.estado === 'DISPONIBLE');

        console.log('Lotes disponibles:', lotesDisponibles);
        this.lotes.set(lotesDisponibles);

        if (lotesDisponibles.length === 0) {
          this.notificationService.showWarning('No se encontraron lotes disponibles para reservar');
        }
      },
      error: (err: any) => {
        console.error('Error al cargar lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    // Validar fechas
    const fechaInicio = new Date(this.reservaForm.value.fechaInicio);
    const fechaVencimiento = new Date(this.reservaForm.value.fechaVencimiento);

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
      asesorId: Number(this.reservaForm.value.asesorId),
      inmuebleId: Number(this.reservaForm.value.inmuebleId),
      montoReserva: Number(this.reservaForm.value.montoReserva),
    };

    console.log('Datos a enviar:', reservaData);

    this.reservaSvc.create(reservaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

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
        console.error('Error completo:', err);

        let errorMessage = 'Error al crear la reserva';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Recurso no encontrado. Verifique los datos ingresados.';
        } else if (err.status === 409) {
          errorMessage = 'El lote ya está reservado. Por favor seleccione otro lote.';
        }

        this.notificationService.showError(errorMessage);
      },
    });
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

  // Método para calcular fecha de vencimiento automáticamente (30 días después)
  calcularFechaVencimiento(): void {
    const fechaInicio = this.reservaForm.get('fechaInicio')?.value;
    if (fechaInicio) {
      const fechaInicioObj = new Date(fechaInicio);
      const fechaVencimientoObj = new Date(fechaInicioObj);
      fechaVencimientoObj.setDate(fechaVencimientoObj.getDate() + 30);

      const fechaVencimientoStr = fechaVencimientoObj.toISOString().split('T')[0];
      this.reservaForm.patchValue({
        fechaVencimiento: fechaVencimientoStr,
      });
    }
  }

  // Método seguro para formatear montos
  formatMonto(monto: any): string {
    if (!monto) return '0.00';
    const montoNum = Number(monto);
    return isNaN(montoNum) ? '0.00' : montoNum.toFixed(2);
  }
}
