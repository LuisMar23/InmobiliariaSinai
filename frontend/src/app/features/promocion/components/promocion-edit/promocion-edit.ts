import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';

@Component({
  selector: 'app-promocion-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './promocion-edit.html',
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

  constructor() {
    this.promocionForm = this.crearFormularioPromocion();
  }

  ngOnInit(): void {
    this.obtenerPromocion();
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
      next: (resp) => {
        if (resp) {
          this.promocionData = resp;
          this.cargarDatosFormulario(resp);
        } else {
          this.error.set('No se encontró la promoción');
        }
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar la promoción');
        this.cargando.set(false);
      },
    });
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
    const dataActualizada = {
      ...this.promocionForm.value,
      descuento: Number(this.promocionForm.value.descuento),
      fechaInicio: new Date(this.promocionForm.value.fechaInicio).toISOString(),
      fechaFin: new Date(this.promocionForm.value.fechaFin).toISOString(),
    };

    this.promocionSvc.update(this.promocionId, dataActualizada).subscribe({
      next: (response) => {
        this.enviando.set(false);
        this.notificationService.showSuccess('Promoción actualizada exitosamente!');
        setTimeout(() => {
          this.router.navigate(['/promociones/lista']);
        }, 1000);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notificationService.showError('Error al actualizar la promoción');
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/promociones/lista']);
  }
}
