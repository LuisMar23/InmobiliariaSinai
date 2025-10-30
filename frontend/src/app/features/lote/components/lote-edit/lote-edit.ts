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
      descripcion: [''],
      ubicacion: [''],
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
      next: (lote) => {
        if (lote) {
          this.loteData = lote;
          this.cargarDatosFormulario(lote);
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
      descripcion: lote.descripcion || '',
      ubicacion: lote.ubicacion || '',
      estado: lote.estado || 'DISPONIBLE',
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

    const dataActualizada: any = {};

    if (this.loteForm.value.urbanizacionId)
      dataActualizada.urbanizacionId = Number(this.loteForm.value.urbanizacionId);
    if (this.loteForm.value.numeroLote) dataActualizada.numeroLote = this.loteForm.value.numeroLote;
    if (this.loteForm.value.superficieM2)
      dataActualizada.superficieM2 = Number(this.loteForm.value.superficieM2);
    if (this.loteForm.value.precioBase)
      dataActualizada.precioBase = Number(this.loteForm.value.precioBase);
    if (this.loteForm.value.descripcion !== undefined)
      dataActualizada.descripcion = this.loteForm.value.descripcion;
    if (this.loteForm.value.ubicacion !== undefined)
      dataActualizada.ubicacion = this.loteForm.value.ubicacion;
    if (this.loteForm.value.estado) dataActualizada.estado = this.loteForm.value.estado;

    this.loteSvc.update(this.loteId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess(
            response.message || 'Lote actualizado exitosamente!'
          );
          setTimeout(() => {
            this.router.navigate(['/lotes/lista']);
          }, 1000);
        } else if (response.id) {
          this.notificationService.showSuccess('Lote actualizado exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/lotes/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar el lote');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar el lote';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Lote no encontrado.';
        } else if (err.status === 409) {
          errorMessage = 'El número de lote ya existe en esta urbanización.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/lotes/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
