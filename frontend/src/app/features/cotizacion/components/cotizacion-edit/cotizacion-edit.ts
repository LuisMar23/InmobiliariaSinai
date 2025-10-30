import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { CotizacionService } from '../../service/cotizacion.service';
import { LoteService } from '../../../lote/service/lote.service';
import { UserService } from '../../../users/services/users.service';
import { AuthService } from '../../../../components/services/auth.service';

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
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private cotizacionSvc = inject(CotizacionService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);

  constructor() {
    this.cotizacionForm = this.crearFormularioCotizacion();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.obtenerCotizacion();
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
