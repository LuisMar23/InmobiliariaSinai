import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { UserService } from '../../../users/services/users.service';
import { ManzanoDto } from '../../../../core/interfaces/manzano.interface';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';
import { ManzanoService } from '../../../manzano/service/manzano.service';
import { CreateLoteDto } from '../../../../core/interfaces/lote.interface';

@Component({
  selector: 'app-lote-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './lote-create.html',
})
export class LoteCreate implements OnInit {
  loteForm!: FormGroup;
  enviando = signal<boolean>(false);
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  asesores = signal<any[]>([]);
  todosManzanos = signal<ManzanoDto[]>([]);
  manzanosFiltrados = signal<ManzanoDto[]>([]);
  searchUrbanizacion = signal<string>('');
  router = inject(Router);
  private fb = inject(FormBuilder);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private userSvc = inject(UserService);
  private manzanoSvc = inject(ManzanoService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.loteForm = this.crearFormularioLote();
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
    this.cargarAsesores();
    this.cargarTodosManzanos();
    this.setupFormListeners();
  }

  crearFormularioLote(): FormGroup {
    return this.fb.group({
      esIndependiente: [false],
      urbanizacionId: [''],
      numeroLote: ['', [Validators.required, Validators.minLength(2)]],
      superficieM2: [0, [Validators.required, Validators.min(0.01)]],
      precioBase: [0, [Validators.required, Validators.min(0.01)]],
      precioM2: ['', Validators.min(0)],
      ciudad: [''],
      descripcion: [''],
      ubicacion: [''],
      manzanoId: [''],
      estado: ['DISPONIBLE'],
      encargadoId: [''],
      partida: [''],
      medidaFrente: ['', Validators.min(0.01)],
      medidaIzquierda: ['', Validators.min(0.01)],
      medidaDerecha: ['', Validators.min(0.01)],
      medidaFondo: ['', Validators.min(0.01)],
      colindaFrontal: [''],
      colindaDerecho: [''],
      colindaIzquierdo: [''],
      colindaFondo: [''],
    });
  }

  cargarAsesores(): void {
    this.userSvc.getAsesoresYAdministradores().subscribe({
      next: (response) => {
        if (response.success && response.data.users) {
          this.asesores.set(response.data.users);
        }
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los encargados disponibles');
      },
    });
  }

  cargarTodosManzanos(): void {
    this.manzanoSvc.getAll().subscribe({
      next: (manzanos) => {
        this.todosManzanos.set(manzanos);
        this.filtrarManzanosPorUrbanizacion(this.loteForm.get('urbanizacionId')?.value);
      },
      error: () => console.error('Error al cargar manzanos'),
    });
  }

  filtrarManzanosPorUrbanizacion(urbanizacionId: string | number): void {
    if (!urbanizacionId) {
      this.manzanosFiltrados.set([]);
      return;
    }
    const id = Number(urbanizacionId);
    const filtrados = this.todosManzanos().filter((m) => m.urbanizacionId === id);
    this.manzanosFiltrados.set(filtrados);
  }

  setupFormListeners(): void {
    this.loteForm.get('esIndependiente')?.valueChanges.subscribe((esIndependiente) => {
      this.onEsIndependienteChange(esIndependiente);
    });
    this.loteForm.get('urbanizacionId')?.valueChanges.subscribe((urbanizacionId) => {
      this.generarNumeroLoteAutomatico();
      this.filtrarManzanosPorUrbanizacion(urbanizacionId);
      if (!urbanizacionId) {
        this.loteForm.patchValue({ manzanoId: '' });
      }
    });
    this.onEsIndependienteChange(this.loteForm.get('esIndependiente')?.value);
  }

  cargarUrbanizaciones(): void {
    this.urbanizacionSvc.getAll(1, 100).subscribe({
      next: (response) => {
        this.urbanizaciones.set(response.data);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar las urbanizaciones');
      },
    });
  }

  generarNumeroLoteAutomatico(): void {
    const esIndependiente = this.loteForm.get('esIndependiente')?.value;
    const urbanizacionId = this.loteForm.get('urbanizacionId')?.value;

    if (esIndependiente) {
      this.loteSvc.getAllLotesIndependientes().subscribe({
        next: (lotes) => {
          const lotesIndependientes = lotes.filter((lote) => lote.esIndependiente);
          const numeros = lotesIndependientes
            .map((lote) => {
              const match = lote.numeroLote?.match(/\d+/);
              return match ? parseInt(match[0]) : 0;
            })
            .filter((num) => !isNaN(num));
          const maxNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
          const siguienteNumero = maxNumero + 1;
          const numeroFormateado = `Lote-${siguienteNumero.toString().padStart(3, '0')}`;
          this.loteForm.patchValue({ numeroLote: numeroFormateado }, { emitEvent: false });
        },
        error: () => {
          this.loteForm.patchValue({ numeroLote: 'Lote-001' }, { emitEvent: false });
        },
      });
    } else if (urbanizacionId) {
      this.loteSvc.getAll(Number(urbanizacionId)).subscribe({
        next: (lotes) => {
          const numeros = lotes
            .map((lote) => {
              const match = lote.numeroLote?.match(/\d+/);
              return match ? parseInt(match[0]) : 0;
            })
            .filter((num) => !isNaN(num));
          const maxNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
          const siguienteNumero = maxNumero + 1;
          const numeroFormateado = `Lote-${siguienteNumero.toString().padStart(3, '0')}`;
          this.loteForm.patchValue({ numeroLote: numeroFormateado }, { emitEvent: false });
        },
        error: () => {
          this.loteForm.patchValue({ numeroLote: 'Lote-001' }, { emitEvent: false });
        },
      });
    }
  }

  onEsIndependienteChange(esIndependiente: boolean): void {
    const urbanizacionIdControl = this.loteForm.get('urbanizacionId');
    const ciudadControl = this.loteForm.get('ciudad');
    const manzanoIdControl = this.loteForm.get('manzanoId');

    if (esIndependiente) {
      urbanizacionIdControl?.clearValidators();
      urbanizacionIdControl?.setValue('');
      ciudadControl?.setValidators([Validators.required]);
      manzanoIdControl?.clearValidators();
      manzanoIdControl?.setValue('');
      this.manzanosFiltrados.set([]);
    } else {
      urbanizacionIdControl?.setValidators([Validators.required]);
      ciudadControl?.clearValidators();
      ciudadControl?.setValue('');
      manzanoIdControl?.setValidators([]);
    }
    urbanizacionIdControl?.updateValueAndValidity();
    ciudadControl?.updateValueAndValidity();
    this.generarNumeroLoteAutomatico();
  }

  selectUrbanizacion(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.id) {
      this.loteForm.patchValue({
        urbanizacionId: urbanizacion.id.toString(),
        ciudad: urbanizacion.ciudad,
      });
      this.searchUrbanizacion.set(urbanizacion.nombre || '');
      this.filtrarManzanosPorUrbanizacion(urbanizacion.id);
    }
  }

  onSubmit(): void {
    if (this.loteForm.invalid) {
      this.loteForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);
    const formValue = this.loteForm.value;
    const loteData: CreateLoteDto = {
      numeroLote: formValue.numeroLote,
      superficieM2: Number(formValue.superficieM2),
      precioBase: Number(formValue.precioBase),
      precioM2: formValue.precioM2 !== '' ? Number(formValue.precioM2) : undefined,
      esIndependiente: Boolean(formValue.esIndependiente),
      estado: formValue.estado,
      descripcion: formValue.descripcion,
      ubicacion: formValue.ubicacion,
      ciudad: formValue.ciudad,
      urbanizacionId: formValue.esIndependiente ? undefined : Number(formValue.urbanizacionId),
      encargadoId: formValue.encargadoId ? Number(formValue.encargadoId) : undefined,
      manzanoId: formValue.manzanoId ? Number(formValue.manzanoId) : undefined,
      partida: formValue.partida,
      medidaFrente: formValue.medidaFrente ? Number(formValue.medidaFrente) : undefined,
      medidaIzquierda: formValue.medidaIzquierda ? Number(formValue.medidaIzquierda) : undefined,
      medidaDerecha: formValue.medidaDerecha ? Number(formValue.medidaDerecha) : undefined,
      medidaFondo: formValue.medidaFondo ? Number(formValue.medidaFondo) : undefined,
      colindaFrontal: formValue.colindaFrontal,
      colindaDerecho: formValue.colindaDerecho,
      colindaIzquierdo: formValue.colindaIzquierdo,
      colindaFondo: formValue.colindaFondo,
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

  @ViewChild('urbanizacionModal') urbanizacionModal!: SeleccionModalComponent;
  urbanizacionModalConfig: ModalConfig = {
    title: 'Seleccionar Urbanización',
    searchPlaceholder: 'Buscar por nombre, ciudad, ubicación...',
    searchKeys: ['nombre', 'ciudad', 'ubicacion'],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'ubicacion', label: 'Ubicación' },
    ],
  };
}
