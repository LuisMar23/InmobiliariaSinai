import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';

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

  router = inject(Router);
  private fb = inject(FormBuilder);
  private promocionSvc = inject(PromocionService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.promocionForm = this.crearFormularioPromocion();
  }

  ngOnInit(): void {
    this.obtenerPromocion();
  }

  crearFormularioPromocion(): FormGroup {
    return this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      descuento: [0, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      aplicaA: ['', Validators.required],
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
      descuento: promocion.descuento || 0,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      aplicaA: promocion.aplicaA || '',
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

    const dataActualizada: any = {};

    if (this.promocionForm.value.titulo) dataActualizada.titulo = this.promocionForm.value.titulo;
    if (this.promocionForm.value.descripcion !== undefined)
      dataActualizada.descripcion = this.promocionForm.value.descripcion;
    if (this.promocionForm.value.descuento)
      dataActualizada.descuento = Number(this.promocionForm.value.descuento);
    if (this.promocionForm.value.fechaInicio)
      dataActualizada.fechaInicio = new Date(this.promocionForm.value.fechaInicio).toISOString();
    if (this.promocionForm.value.fechaFin)
      dataActualizada.fechaFin = new Date(this.promocionForm.value.fechaFin).toISOString();
    if (this.promocionForm.value.aplicaA)
      dataActualizada.aplicaA = this.promocionForm.value.aplicaA;

    this.promocionSvc.update(this.promocionId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess(
            response.message || 'Promoción actualizada exitosamente!'
          );
          setTimeout(() => {
            this.router.navigate(['/promociones/lista']);
          }, 1000);
        } else if (response.id) {
          this.notificationService.showSuccess('Promoción actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/promociones/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar la promoción'
          );
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la promoción';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Promoción no encontrada.';
        } else if (err.status === 409) {
          errorMessage = 'El título de la promoción ya existe.';
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
}
