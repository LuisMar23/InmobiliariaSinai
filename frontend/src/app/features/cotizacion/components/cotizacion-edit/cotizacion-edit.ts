// src/app/modules/cotizacion/components/cotizacion-edit/cotizacion-edit.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { CotizacionService } from '../../service/cotizacion.service';
import { UserService } from '../../../../core/services/users.service';
import { LoteService } from '../../../lote/service/lote.service';

@Component({
  selector: 'app-cotizacion-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cotizacion-edit.html',
  providers: [DatePipe],
})
export class CotizacionEdit implements OnInit {
  cotizacionForm: FormGroup;
  cotizacionId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  cotizacionData: any = null;
  clientes = signal<UserDto[]>([]);
  asesores = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private cotizacionSvc = inject(CotizacionService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.cotizacionForm = this.crearFormularioCotizacion();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarAsesores();
    this.cargarLotes();
    this.obtenerCotizacion();
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
        this.lotes.set(lotes);
      },
      error: (err: any) => {
        console.error('Error al cargar lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  obtenerCotizacion(): void {
    this.cotizacionId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.cotizacionId) {
      this.error.set('ID de cotización no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.cotizacionSvc.getById(this.cotizacionId).subscribe({
      next: (cotizacion: any) => {
        if (cotizacion) {
          this.cotizacionData = cotizacion;
          this.cargarDatosFormulario(cotizacion);
        } else {
          this.error.set('No se encontró la cotización');
        }
        this.cargando.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar cotización:', err);
        this.error.set('No se pudo cargar la cotización');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(cotizacion: any): void {
    this.cotizacionForm.patchValue({
      clienteId: cotizacion.clienteId?.toString() || '',
      asesorId: cotizacion.asesorId?.toString() || '',
      inmuebleTipo: cotizacion.inmuebleTipo || 'LOTE',
      inmuebleId: cotizacion.inmuebleId?.toString() || '',
      precioOfertado: cotizacion.precioOfertado || 0,
      estado: cotizacion.estado || 'PENDIENTE',
    });
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
    if (this.cotizacionForm.invalid) {
      this.cotizacionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.cotizacionId) {
      this.notificationService.showError('ID de cotización no válido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada = {
      ...this.cotizacionForm.value,
      clienteId: Number(this.cotizacionForm.value.clienteId),
      asesorId: Number(this.cotizacionForm.value.asesorId),
      inmuebleId: Number(this.cotizacionForm.value.inmuebleId),
      precioOfertado: Number(this.cotizacionForm.value.precioOfertado),
    };

    console.log('Datos a actualizar:', dataActualizada);

    this.cotizacionSvc.update(this.cotizacionId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          this.notificationService.showSuccess('Cotización actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/cotizaciones/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar la cotización'
          );
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error al actualizar:', err);

        let errorMessage = 'Error al actualizar la cotización';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Cotización no encontrada.';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/cotizaciones/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
