// src/app/modules/promocion/components/promocion-create/promocion-create.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';
import { LoteService } from '../../../lote/service/lote.service';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';

@Component({
  selector: 'app-promocion-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './promocion-create.html',
})
export class PromocionCreate implements OnInit {
  promocionForm: FormGroup;
  enviando = signal<boolean>(false);
  lotesDisponibles = signal<LoteDto[]>([]);
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  lotesSeleccionados = signal<number[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private promocionSvc = inject(PromocionService);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.promocionForm = this.crearFormularioPromocion();
  }

  ngOnInit(): void {
    this.cargarLotesDisponibles();
    this.cargarUrbanizaciones();
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

    this.enviando.set(true);

    const formValue = this.promocionForm.value;
    const promocionData = {
      titulo: formValue.titulo,
      descripcion: formValue.descripcion,
      descuento: Number(formValue.descuento),
      fechaInicio: new Date(formValue.fechaInicio).toISOString(),
      fechaFin: new Date(formValue.fechaFin).toISOString(),
      urbanizacionId: formValue.urbanizacionId ? Number(formValue.urbanizacionId) : undefined,
      lotesIds: this.lotesSeleccionados().length > 0 ? this.lotesSeleccionados() : undefined,
    };

    this.promocionSvc.create(promocionData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success === true) {
          this.notificationService.showSuccess('Promoción creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/promociones/lista']);
          }, 1500);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la promoción');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la promoción';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
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
