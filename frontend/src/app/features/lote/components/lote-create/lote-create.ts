import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { UserService } from '../../../users/services/users.service';
import { ModalConfig, SeleccionModalComponent } from "../../../../components/seleccion-modal/seleccion-modal";

@Component({
  selector: 'app-lote-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './lote-create.html',
})
export class LoteCreate implements OnInit {
  loteForm: FormGroup;
  enviando = signal<boolean>(false);
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  asesores = signal<any[]>([]);
  searchUrbanizacion = signal<string>('');
  showUrbanizacionDropdown = signal<boolean>(false);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private userSvc = inject(UserService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.loteForm = this.crearFormularioLote();
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
    this.cargarAsesores();
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
      manzano:[''],
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
    this.loteForm.get('urbanizacionId')?.valueChanges.subscribe(() => {
      this.generarNumeroLoteAutomatico();
    });
    this.onEsIndependienteChange(this.loteForm.get('esIndependiente')?.value);
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

  generarNumeroLoteAutomatico(): void {
    const esIndependiente = this.loteForm.get('esIndependiente')?.value;
    const urbanizacionId = this.loteForm.get('urbanizacionId')?.value;

    if (esIndependiente) {
      this.loteSvc.getAll().subscribe({
        next: (lotes) => {
          const lotesIndependientes = lotes.filter((lote) => lote.esIndependiente);
          const siguienteNumero = lotesIndependientes.length + 1;
          const numeroFormateado = `Lote-${siguienteNumero.toString().padStart(3, '0')}`;
          this.loteForm.patchValue({ numeroLote: numeroFormateado }, { emitEvent: false });
        },
        error: (err) => {
          console.error('Error al cargar lotes:', err);
          this.loteForm.patchValue({ numeroLote: 'Lote-001' }, { emitEvent: false });
        },
      });
    } else if (urbanizacionId) {
      this.loteSvc.getAll(Number(urbanizacionId)).subscribe({
        next: (lotes) => {
          const siguienteNumero = lotes.length + 1;
          const numeroFormateado = `Lote-${siguienteNumero.toString().padStart(3, '0')}`;
          this.loteForm.patchValue({ numeroLote: numeroFormateado }, { emitEvent: false });
        },
        error: (err) => {
          console.error('Error al cargar lotes:', err);
          this.loteForm.patchValue({ numeroLote: 'Lote-001' }, { emitEvent: false });
        },
      });
    }
  }

  onEsIndependienteChange(esIndependiente: boolean): void {
    const urbanizacionIdControl = this.loteForm.get('urbanizacionId');
    const ciudadControl = this.loteForm.get('ciudad');

    if (esIndependiente) {
      urbanizacionIdControl?.clearValidators();
      urbanizacionIdControl?.setValue('');
      ciudadControl?.setValidators([Validators.required]);
    } else {
      urbanizacionIdControl?.setValidators([Validators.required]);
      ciudadControl?.clearValidators();
      ciudadControl?.setValue('');
    }

    urbanizacionIdControl?.updateValueAndValidity();
    ciudadControl?.updateValueAndValidity();

    this.generarNumeroLoteAutomatico();
  }

  // filteredUrbanizaciones() {
  //   const search = this.searchUrbanizacion().toLowerCase();
  //   if (!search) return this.urbanizaciones();
  //   return this.urbanizaciones().filter((urbanizacion) =>
  //     urbanizacion.nombre?.toLowerCase().includes(search)
  //   );
  // }

  selectUrbanizacion(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.id) {
      this.loteForm.patchValue({
        urbanizacionId: urbanizacion.id.toString(),
        ciudad: urbanizacion.ciudad,
      });
      this.searchUrbanizacion.set(urbanizacion.nombre || '');
      this.showUrbanizacionDropdown.set(false);
      this.generarNumeroLoteAutomatico();
    }
  }

  // toggleUrbanizacionDropdown() {
  //   this.showUrbanizacionDropdown.set(!this.showUrbanizacionDropdown());
  // }

  // onUrbanizacionBlur() {
  //   setTimeout(() => {
  //     this.showUrbanizacionDropdown.set(false);
  //   }, 200);
  // }

  onSubmit(): void {
    if (this.loteForm.invalid) {
      this.loteForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);
    const formValue = this.loteForm.value;
    const loteData = {
      ...formValue,
      urbanizacionId: formValue.esIndependiente ? null : Number(formValue.urbanizacionId),
      superficieM2: Number(formValue.superficieM2),
      precioBase: Number(formValue.precioBase),
  
      esIndependiente: Boolean(formValue.esIndependiente),
      encargadoId: formValue.encargadoId ? Number(formValue.encargadoId) : undefined,
    };
    console.log(loteData)
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

  limpiarBusquedaUrbanizacion(): void {
    this.searchUrbanizacion.set('');
    this.loteForm.patchValue({ urbanizacionId: '' });
  }


  @ViewChild('urbanizacionModal') urbanizacionModal!: SeleccionModalComponent;
urbanizacionModalConfig: ModalConfig = {
  title: 'Seleccionar Urbanización',
  searchPlaceholder: 'Buscar por nombre, ciudad, ubicación...',
  searchKeys: ['nombre', 'ciudad', 'ubicacion'],
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'ubicacion', label: 'Ubicación' },
  ]
};


}