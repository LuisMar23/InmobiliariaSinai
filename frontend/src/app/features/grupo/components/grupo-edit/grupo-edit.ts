import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GrupoService } from '../../service/grupo.service';
import { SedeService } from '../../../sede/service/sede.service';
import { SedeDto } from '../../../../core/interfaces/sede.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';

@Component({
  selector: 'app-grupo-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './grupo-edit.html',
  styleUrls: ['./grupo-edit.css'],
})
export class GrupoEdit implements OnInit {
  form!: FormGroup;
  sedes = signal<SedeDto[]>([]);
  enviando = signal(false);
  cargando = signal(true);
  searchSede = signal('');
  id!: number;

  private fb = inject(FormBuilder);
  private grupoSvc = inject(GrupoService);
  private sedeSvc = inject(SedeService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.form = this.fb.group({
      tipoUsuario: ['', [Validators.required, Validators.minLength(2)]],
      nombreEmpresa: [''],
      descripcion: [''],
      sedeId: ['', Validators.required],
    });
    this.cargarDatos();
  }

  cargarDatos() {
    forkJoin({
      sedes: this.sedeSvc.getAll(),
      grupo: this.grupoSvc.getById(this.id),
    }).subscribe({
      next: ({ sedes, grupo }) => {
        this.sedes.set(sedes);
        this.form.patchValue({
          tipoUsuario: grupo.tipoUsuario,
          nombreEmpresa: grupo.nombreEmpresa || '',
          descripcion: grupo.descripcion || '',
          sedeId: grupo.sedeId,
        });
        const sede = this.sedes().find((s) => s.id === grupo.sedeId);
        if (sede) this.searchSede.set(sede.nombre);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notify.showError('Error al cargar los datos');
        this.router.navigate(['/grupos']);
      },
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
    this.grupoSvc.update(this.id, this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Grupo actualizado exitosamente');
        this.router.navigate(['/grupos']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al actualizar el grupo');
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
