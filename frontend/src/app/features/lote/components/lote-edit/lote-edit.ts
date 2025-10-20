import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';

@Component({
  selector: 'app-lote-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lote-edit.html',
  providers: [DatePipe],
})
export class LoteEdit implements OnInit {
  loteForm: FormGroup;
  loteId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  loteData: any = null;
  urbanizaciones = signal<UrbanizacionDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.loteForm = this.crearFormularioLote();
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
    this.obtenerLote();
  }

  crearFormularioLote(): FormGroup {
    return this.fb.group({
      urbanizacionId: ['', Validators.required],
      numeroLote: ['', [Validators.required, Validators.minLength(2)]],
      superficieM2: [0, [Validators.required, Validators.min(0.01)]],
      precioBase: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['DISPONIBLE'],
    });
  }

  cargarUrbanizaciones(): void {
    this.urbanizacionSvc.getAll(1, 100).subscribe({
      next: (response) => {
        this.urbanizaciones.set(response.data);
      },
      error: (err) => {
        console.error('Error al cargar urbanizaciones:', err);
        this.notificationService.showError('No se pudieron cargar las urbanizaciones');
      },
    });
  }

  obtenerLote(): void {
    this.loteId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.loteId) {
      this.error.set('ID de lote no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.loteSvc.getById(this.loteId).subscribe({
      next: (resp) => {
        if (resp) {
          this.loteData = resp;
          this.cargarDatosFormulario(resp);
        } else {
          this.error.set('No se encontró el lote');
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar lote:', err);
        this.error.set('No se pudo cargar el lote');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(lote: any): void {
    this.loteForm.patchValue({
      urbanizacionId: lote.urbanizacionId?.toString() || '',
      numeroLote: lote.numeroLote || '',
      superficieM2: lote.superficieM2 || 0,
      precioBase: lote.precioBase || 0,
      estado: lote.estado || 'DISPONIBLE',
    });
  }

  // Método para formatear fecha
  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onSubmit(): void {
    if (this.loteForm.invalid) {
      this.loteForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.loteId) {
      this.notificationService.showError('ID de lote no válido.');
      return;
    }

    this.enviando.set(true);

    // Convertir urbanizacionId a número
    const dataActualizada = {
      ...this.loteForm.value,
      urbanizacionId: Number(this.loteForm.value.urbanizacionId),
      superficieM2: Number(this.loteForm.value.superficieM2),
      precioBase: Number(this.loteForm.value.precioBase),
    };

    console.log('Datos a actualizar:', dataActualizada);

    this.loteSvc.update(this.loteId, dataActualizada).subscribe({
      next: (response) => {
        this.enviando.set(false);
        this.notificationService.showSuccess('Lote actualizado exitosamente!');
        setTimeout(() => {
          this.router.navigate(['/lotes/lista']);
        }, 1000);
      },
      error: (err) => {
        this.enviando.set(false);
        console.error('Error al actualizar:', err);

        let errorMessage = 'Error al actualizar el lote';
        if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
          if (err.error?.message) {
            errorMessage += ` Detalles: ${err.error.message}`;
          }
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/lotes/lista']);
  }

  // Método para manejar el evento submit del formulario
  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
