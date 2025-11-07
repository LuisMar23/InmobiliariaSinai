import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UrbanizacionService } from '../../services/urbanizacion.service';

@Component({
  selector: 'app-urbanizacion-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './urbanizacion-edit.html',
})
export class UrbanizacionEdit implements OnInit {
  urbanizacionForm: FormGroup;
  urbanizacionId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  urbanizacionData: any = null;

  router = inject(Router);
  private fb = inject(FormBuilder);
  private urbanizacionSvc = inject(UrbanizacionService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  constructor() {
    this.urbanizacionForm = this.crearFormularioUrbanizacion();
  }

  ngOnInit(): void {
    this.obtenerUrbanizacion();
  }

  crearFormularioUrbanizacion(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      ubicacion: ['', [Validators.required]],
      ciudad: ['', [Validators.required]],
      descripcion: [''],
    });
  }

  obtenerUrbanizacion(): void {
    this.urbanizacionId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.urbanizacionId) {
      this.error.set('ID de urbanización no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.urbanizacionSvc.getById(this.urbanizacionId).subscribe({
      next: (urbanizacion) => {
        if (urbanizacion) {
          this.urbanizacionData = urbanizacion;
          this.cargarDatosFormulario(urbanizacion);
        } else {
          this.error.set('No se encontró la urbanización');
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar urbanización:', err);
        this.error.set('No se pudo cargar la urbanización');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(urbanizacion: any): void {
    this.urbanizacionForm.patchValue({
      nombre: urbanizacion.nombre || '',
      ubicacion: urbanizacion.ubicacion || '',
      ciudad: urbanizacion.ciudad || '',
      descripcion: urbanizacion.descripcion || '',
    });
  }

  onSubmit(): void {
    if (this.urbanizacionForm.invalid) {
      this.urbanizacionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.urbanizacionId) {
      this.notificationService.showError('ID de urbanización no válido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada = this.urbanizacionForm.value;

    this.urbanizacionSvc.update(this.urbanizacionId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success === true) {
          this.notificationService.showSuccess('Urbanización actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/urbanizaciones/lista']);
          }, 1500);
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar la urbanización'
          );
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la urbanización';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Urbanización no encontrada.';
        } else if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/urbanizaciones/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
