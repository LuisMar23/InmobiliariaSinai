import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { CotizacionService } from '../../service/cotizacion.service';
import { LoteService } from '../../../lote/service/lote.service';
import { UserService } from '../../../users/services/users.service';
import { AuthService } from '../../../../components/services/auth.service';

@Component({
  selector: 'app-cotizacion-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cotizacion-create.html',
})
export class CotizacionCreate implements OnInit {
  cotizacionForm: FormGroup;
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private cotizacionSvc = inject(CotizacionService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  constructor() {
    this.cotizacionForm = this.crearFormularioCotizacion();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
  }

  crearFormularioCotizacion(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioOfertado: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
    });
  }

  cargarClientes(): void {
    this.authService.getClientes().subscribe({
      next: (response: any) => {
        console.log('Respuesta completa de clientes:', response);

        let clientes: any[] = [];

        if (response.data && Array.isArray(response.data.clientes)) {
          clientes = response.data.clientes;
        } else if (response.data && Array.isArray(response.data)) {
          clientes = response.data;
        } else if (Array.isArray(response)) {
          clientes = response;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          this.notificationService.showWarning('No se pudieron cargar los clientes');
          return;
        }

        console.log('Clientes cargados:', clientes);
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

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        const lotesDisponibles = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA'
        );
        this.lotes.set(lotesDisponibles);
      },
      error: (err: any) => {
        console.error('Error al cargar lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  onSubmit(): void {
    if (this.cotizacionForm.invalid) {
      this.cotizacionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'ASESOR') {
      this.notificationService.showError('Solo los asesores pueden crear cotizaciones');
      return;
    }

    this.enviando.set(true);

    const cotizacionData = {
      ...this.cotizacionForm.value,
      clienteId: Number(this.cotizacionForm.value.clienteId),
      inmuebleId: Number(this.cotizacionForm.value.inmuebleId),
      precioOfertado: Number(this.cotizacionForm.value.precioOfertado),
    };

    console.log('Datos a enviar:', cotizacionData);

    this.cotizacionSvc.create(cotizacionData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          this.notificationService.showSuccess('Cotización creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/cotizaciones/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la cotización');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error completo:', err);

        let errorMessage = 'Error al crear la cotización';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para crear cotizaciones. Se requiere rol de ASESOR';
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

  getClienteNombre(): string {
    const clienteId = this.cotizacionForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cliente';

    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'No encontrado';
  }
}
