import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';

@Component({
  selector: 'app-lote-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lote-create.html',
})
export class LoteCreate implements OnInit {
  loteForm: FormGroup;
  enviando = signal<boolean>(false);
  urbanizaciones = signal<UrbanizacionDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.loteForm = this.crearFormularioLote();
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
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

  // Método para manejar el envío del formulario
  onSubmit(): void {
    if (this.loteForm.invalid) {
      this.loteForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);

    // Convertir urbanizacionId a número
    const loteData = {
      ...this.loteForm.value,
      urbanizacionId: Number(this.loteForm.value.urbanizacionId),
      superficieM2: Number(this.loteForm.value.superficieM2),
      precioBase: Number(this.loteForm.value.precioBase),
    };

    console.log('Datos a enviar:', loteData);

    this.loteSvc.create(loteData).subscribe({
      next: (response) => {
        this.enviando.set(false);
        this.notificationService.showSuccess('Lote creado exitosamente!');
        setTimeout(() => {
          this.router.navigate(['/lotes/lista']);
        }, 1000);
      },
      error: (err) => {
        this.enviando.set(false);
        console.error('Error completo:', err);

        let errorMessage = 'Error al crear el lote';
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

  // Método para manejar el evento submit del formulario
  handleFormSubmit(event: Event): void {
    event.preventDefault(); // Prevenir el comportamiento por defecto
    this.onSubmit();
  }
}
