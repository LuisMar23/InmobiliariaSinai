import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { GrupoService } from '../../service/grupo.service';
import { SedeService } from '../../../sede/service/sede.service';
import { SedeDto } from '../../../../core/interfaces/sede.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';

@Component({
  selector: 'app-grupo-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './grupo-create.html',
  styleUrls: ['./grupo-create.css'],
})
export class GrupoCreate implements OnInit {
  form!: FormGroup;
  sedes = signal<SedeDto[]>([]);
  enviando = signal(false);
  searchSede = signal('');

  private fb = inject(FormBuilder);
  private grupoSvc = inject(GrupoService);
  private sedeSvc = inject(SedeService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.form = this.fb.group({
      tipoUsuario: ['', [Validators.required, Validators.minLength(2)]],
      nombreEmpresa: [''],
      descripcion: [''],
      sedeId: ['', Validators.required],
    });
    this.cargarSedes();
  }

  cargarSedes() {
    this.sedeSvc.getAll().subscribe({
      next: (res) => this.sedes.set(res),
      error: () => this.notify.showError('No se pudieron cargar las sedes'),
    });
  }

  selectSede(sede: SedeDto) {
    if (sede.id) {
      this.form.patchValue({ sedeId: sede.id.toString() });
      this.searchSede.set(sede.nombre || '');
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.showError('Complete todos los campos requeridos');
      return;
    }
    this.enviando.set(true);
    this.grupoSvc.create(this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Grupo creado exitosamente');
        this.router.navigate(['/grupos']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al crear el grupo');
      },
    });
  }

  @ViewChild('sedeModal') sedeModal!: SeleccionModalComponent;
  sedeModalConfig: ModalConfig = {
    title: 'Seleccionar Sede',
    searchPlaceholder: 'Buscar por nombre, dirección, teléfono...',
    searchKeys: ['nombre', 'direccion', 'telefono'],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'telefono', label: 'Teléfono' },
    ],
  };
}
