// src/app/modules/promocion/components/promocion-edit/promocion-edit.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';
import { LoteService } from '../../../lote/service/lote.service';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';

@Component({
  selector: 'app-promocion-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './promocion-edit.html',
  providers: [DatePipe],
})
export class PromocionEdit implements OnInit {
  promocionForm: FormGroup;
  promocionId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  promocionData: any = null;
  lotesDisponibles = signal<LoteDto[]>([]);
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  lotesSeleccionados = signal<number[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private promocionSvc = inject(PromocionService);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.promocionForm = this.crearFormularioPromocion();
  }

  ngOnInit(): void {
    this.cargarLotesDisponibles();
    this.cargarUrbanizaciones();
    this.obtenerPromocion();
  }

  crearFormularioPromocion(): FormGroup {
    return this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      descuento: [0, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      urbanizacionId: [''],
    });
  }

  cargarLotesDisponibles(): void {
    this.promocionSvc.getLotesDisponibles().subscribe({
      next: (lotes) => {
        this.lotesDisponibles.set(lotes);
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.loteSvc.getAll().subscribe({
          next: (lotes) => {
            this.lotesDisponibles.set(lotes.filter((lote) => lote.estado === 'DISPONIBLE'));
          },
          error: (err) => {
            console.error('Error al cargar lotes alternativo:', err);
          },
        });
      },
    });
  }

  cargarUrbanizaciones(): void {
    this.urbanizacionSvc.getAll(1, 100).subscribe({
      next: (response) => {
        this.urbanizaciones.set(response.data);
      },
      error: (err) => {
        console.error('Error al cargar urbanizaciones:', err);
      },
    });
  }

  obtenerPromocion(): void {
    this.promocionId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.promocionId) {
      this.error.set('ID de promoción no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.promocionSvc.getById(this.promocionId).subscribe({
      next: (promocion) => {
        if (promocion) {
          this.promocionData = promocion;
          this.cargarDatosFormulario(promocion);
          this.cargarLotesSeleccionados(promocion);
        } else {
          this.error.set('No se encontró la promoción');
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar promoción:', err);
        this.error.set('No se pudo cargar la promoción');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(promocion: any): void {
    const fechaInicio = promocion.fechaInicio
      ? new Date(promocion.fechaInicio).toISOString().split('T')[0]
      : '';
    const fechaFin = promocion.fechaFin
      ? new Date(promocion.fechaFin).toISOString().split('T')[0]
      : '';

    this.promocionForm.patchValue({
      titulo: promocion.titulo || '',
      descripcion: promocion.descripcion || '',
      descuento: Number(promocion.descuento) || 0,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      urbanizacionId: promocion.urbanizacionId || '',
    });
  }

  cargarLotesSeleccionados(promocion: any): void {
    if (promocion.lotesAfectados && promocion.lotesAfectados.length > 0) {
      const lotesIds = promocion.lotesAfectados.map((lp: any) => lp.loteId);
      this.lotesSeleccionados.set(lotesIds);
    }
  }

  toggleLoteSeleccionado(loteId: number): void {
    const seleccionados = this.lotesSeleccionados();
    if (seleccionados.includes(loteId)) {
      this.lotesSeleccionados.set(seleccionados.filter((id) => id !== loteId));
    } else {
      this.lotesSeleccionados.set([...seleccionados, loteId]);
    }
  }

  estaLoteSeleccionado(loteId: number): boolean {
    return this.lotesSeleccionados().includes(loteId);
  }

  onSubmit(): void {
    if (this.promocionForm.invalid) {
      this.promocionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.promocionId) {
      this.notificationService.showError('ID de promoción no válido.');
      return;
    }

    this.enviando.set(true);

    const formValue = this.promocionForm.value;
    const dataActualizada = {
      titulo: formValue.titulo,
      descripcion: formValue.descripcion,
      descuento: Number(formValue.descuento),
      fechaInicio: new Date(formValue.fechaInicio).toISOString(),
      fechaFin: new Date(formValue.fechaFin).toISOString(),
      urbanizacionId: formValue.urbanizacionId ? Number(formValue.urbanizacionId) : undefined,
      lotesIds: this.lotesSeleccionados().length > 0 ? this.lotesSeleccionados() : undefined,
    };

    this.promocionSvc.update(this.promocionId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success === true) {
          this.notificationService.showSuccess('Promoción actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/promociones/lista']);
          }, 1500);
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar la promoción'
          );
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la promoción';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Promoción no encontrada.';
        } else if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/promociones/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  seleccionarTodosLotes(): void {
    const todosLotesIds = this.lotesDisponibles().map((lote) => lote.id);
    this.lotesSeleccionados.set(todosLotesIds);
  }

  deseleccionarTodosLotes(): void {
    this.lotesSeleccionados.set([]);
  }
}
