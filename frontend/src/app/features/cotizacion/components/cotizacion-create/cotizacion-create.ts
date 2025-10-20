// src/app/modules/cotizacion/components/cotizacion-create/cotizacion-create.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UserService } from '../../../../core/services/users.service';
import { CotizacionService } from '../../service/cotizacion.service';
import { LoteService } from '../../../lote/service/lote.service';

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
  asesores = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private cotizacionSvc = inject(CotizacionService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.cotizacionForm = this.crearFormularioCotizacion();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarAsesores();
    this.cargarLotes();
  }

  crearFormularioCotizacion(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      asesorId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioOfertado: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
    });
  }

  cargarClientes(): void {
    this.userSvc.getAll().subscribe({
      next: (response: any) => {
        console.log('Respuesta completa de usuarios:', response);

        // CORREGIDO: El backend devuelve el array directamente, no response.data
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

        // Filtra solo usuarios con rol CLIENTE
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

        // CORREGIDO: El backend devuelve el array directamente, no response.data
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

        // Filtra solo usuarios con rol ASESOR
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
        // Filtra solo lotes disponibles o con oferta
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

    this.enviando.set(true);

    const cotizacionData = {
      ...this.cotizacionForm.value,
      clienteId: Number(this.cotizacionForm.value.clienteId),
      asesorId: Number(this.cotizacionForm.value.asesorId),
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
        } else if (err.status === 404) {
          errorMessage = 'Recurso no encontrado. Verifique los datos ingresados.';
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

  getAsesorNombre(): string {
    const asesorId = this.cotizacionForm.get('asesorId')?.value;
    if (!asesorId) return 'Sin asesor';

    const asesor = this.asesores().find((a) => a.id === Number(asesorId));
    return asesor ? asesor.fullName : 'No encontrado';
  }
}
