import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { UserService } from '../../../users/services/users.service';

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
  asesores = signal<any[]>([]);

  searchUrbanizacion = signal<string>('');
  showUrbanizacionDropdown = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private userSvc = inject(UserService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.loteForm = this.crearFormularioLote();
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
    this.cargarAsesores();
    this.obtenerLote();
    this.setupFormListeners();
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
      encargadoId: [''],
    });
  }

  cargarAsesores(): void {
    this.userSvc.getAsesoresYAdministradores().subscribe({
      next: (response) => {
        if (response.success && response.data.users) {
          this.asesores.set(response.data.users);
        }
      },
      error: (err) => {
        console.error('Error al cargar asesores:', err);
        this.notificationService.showError('No se pudieron cargar los encargados disponibles');
      },
    });
  }

  setupFormListeners(): void {
    this.loteForm.get('esIndependiente')?.valueChanges.subscribe((esIndependiente) => {
      this.onEsIndependienteChange(esIndependiente);
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

  onEsIndependienteChange(esIndependiente: boolean): void {
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
    const urbanizacionSeleccionada = this.urbanizaciones().find(
      (u) => u.id === lote.urbanizacionId
    );

    this.loteForm.patchValue({
      esIndependiente: lote.esIndependiente || false,
      urbanizacionId: lote.urbanizacionId?.toString() || '',
      numeroLote: lote.numeroLote || '',
      superficieM2: lote.superficieM2 || 0,
      precioBase: lote.precioBase || 0,
      ciudad: lote.ciudad || '',
      descripcion: lote.descripcion || '',
      ubicacion: lote.ubicacion || '',
      estado: lote.estado || 'DISPONIBLE',
      encargadoId: lote.encargadoId || '',
    });

    if (urbanizacionSeleccionada) {
      this.searchUrbanizacion.set(urbanizacionSeleccionada.nombre || '');
    }

    this.onEsIndependienteChange(lote.esIndependiente || false);
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

    const formValue = this.loteForm.value;
const dataActualizada: any = {
  esIndependiente: formValue.esIndependiente,
  urbanizacionId: formValue.esIndependiente ? null : Number(formValue.urbanizacionId),
  numeroLote: formValue.numeroLote,
  superficieM2: Number(formValue.superficieM2),
  precioBase: Number(formValue.precioBase),
  ciudad: formValue.ciudad,
  descripcion: formValue.descripcion,
  ubicacion: formValue.ubicacion,
  estado: formValue.estado,
  ...(formValue.encargadoId && { encargadoId: Number(formValue.encargadoId) }),
};
    console.log(dataActualizada)
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

  getTipoLote(): string {
    return this.loteForm.get('esIndependiente')?.value
      ? 'Lote Independiente'
      : 'Lote en Urbanización';
  }

  getUrbanizacionNombre(): string {
    const urbanizacionId = this.loteForm.get('urbanizacionId')?.value;
    if (!urbanizacionId) return 'Lote Independiente';

    const urbanizacion = this.urbanizaciones().find((u) => u.id === Number(urbanizacionId));
    return urbanizacion ? urbanizacion.nombre : 'No encontrada';
  }

  limpiarBusquedaUrbanizacion(): void {
    this.searchUrbanizacion.set('');
    this.loteForm.patchValue({ urbanizacionId: '' });
  }
}