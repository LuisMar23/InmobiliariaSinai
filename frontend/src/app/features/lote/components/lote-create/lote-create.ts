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

  searchUrbanizacion = signal<string>('');
  showUrbanizacionDropdown = signal<boolean>(false);

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
      esIndependiente: [false],
      urbanizacionId: [''],
      numeroLote: ['', [Validators.required, Validators.minLength(2)]],
      superficieM2: [0, [Validators.required, Validators.min(0.01)]],
      precioBase: [0, [Validators.required, Validators.min(0.01)]],
      ciudad: [''],
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

  onEsIndependienteChange(): void {
    const esIndependiente = this.loteForm.get('esIndependiente')?.value;
    const urbanizacionIdControl = this.loteForm.get('urbanizacionId');
    const ciudadControl = this.loteForm.get('ciudad');

    if (esIndependiente) {
      urbanizacionIdControl?.clearValidators();
      ciudadControl?.setValidators([Validators.required]);
    } else {
      urbanizacionIdControl?.setValidators([Validators.required]);
      ciudadControl?.clearValidators();
    }

    urbanizacionIdControl?.updateValueAndValidity();
    ciudadControl?.updateValueAndValidity();

    // Limpiar campos cuando cambia el tipo
    if (esIndependiente) {
      this.loteForm.patchValue({ urbanizacionId: '' });
      this.searchUrbanizacion.set('');
    } else {
      this.loteForm.patchValue({ ciudad: '' });
    }
  }

  filteredUrbanizaciones() {
    const search = this.searchUrbanizacion().toLowerCase();
    if (!search) return this.urbanizaciones();

    return this.urbanizaciones().filter((urbanizacion) =>
      urbanizacion.nombre?.toLowerCase().includes(search)
    );
  }

  selectUrbanizacion(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.id) {
      this.loteForm.patchValue({
        urbanizacionId: urbanizacion.id.toString(),
        ciudad: urbanizacion.ciudad,
      });
      this.searchUrbanizacion.set(urbanizacion.nombre || '');
      this.showUrbanizacionDropdown.set(false);
    }
  }

  toggleUrbanizacionDropdown() {
    this.showUrbanizacionDropdown.set(!this.showUrbanizacionDropdown());
  }

  onUrbanizacionBlur() {
    setTimeout(() => {
      this.showUrbanizacionDropdown.set(false);
    }, 200);
  }

  onSubmit(): void {
    if (this.loteForm.invalid) {
      this.loteForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);

    const loteData = {
      ...this.loteForm.value,
      urbanizacionId: this.loteForm.value.esIndependiente
        ? null
        : Number(this.loteForm.value.urbanizacionId),
      superficieM2: Number(this.loteForm.value.superficieM2),
      precioBase: Number(this.loteForm.value.precioBase),
      esIndependiente: Boolean(this.loteForm.value.esIndependiente),
    };

    this.loteSvc.create(loteData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess('Lote creado exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/lotes/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear el lote');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);

        let errorMessage = 'Error al crear el lote';
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

  getUrbanizacionNombre(): string {
    const urbanizacionId = this.loteForm.get('urbanizacionId')?.value;
    if (!urbanizacionId) return 'Lote Independiente';

    const urbanizacion = this.urbanizaciones().find((u) => u.id === Number(urbanizacionId));
    return urbanizacion ? urbanizacion.nombre : 'No encontrada';
  }

  getTipoLote(): string {
    return this.loteForm.get('esIndependiente')?.value
      ? 'Lote Independiente'
      : 'Lote en Urbanización';
  }
}
