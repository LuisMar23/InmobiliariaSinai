import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';

@Component({
  selector: 'app-promocion-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './promocion-create.html',
})
export class PromocionCreate {
  promocionForm: FormGroup;
  enviando = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private promocionSvc = inject(PromocionService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.promocionForm = this.crearFormularioPromocion();
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

  onSubmit(): void {
    if (this.promocionForm.invalid) {
      this.promocionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);

    const promocionData = {
      ...this.promocionForm.value,
      descuento: Number(this.promocionForm.value.descuento),
      fechaInicio: new Date(this.promocionForm.value.fechaInicio).toISOString(),
      fechaFin: new Date(this.promocionForm.value.fechaFin).toISOString(),
    };

    this.promocionSvc.create(promocionData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          this.notificationService.showSuccess('Promoción creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/promociones/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la promoción');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error completo:', err);

        let errorMessage = 'Error al crear la promoción';
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
}
