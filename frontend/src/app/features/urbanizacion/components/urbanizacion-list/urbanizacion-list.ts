import { Component, computed, inject, signal } from '@angular/core';
import {
  faBuilding,
  faEye,
  faPenToSquare,
  faSearch,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { UrbanizacionService } from '../../services/urbanizacion.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-urbanizacion-list',
  standalone: true,
  imports: [FontAwesomeModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './urbanizacion-list.html',
  styleUrl: './urbanizacion-list.css',
})
export class UrbanizacionList {
  faBuilding = faBuilding;
  faEye = faEye;
  faPenToSquare = faPenToSquare;
  faTrash = faTrash;
  faSearch = faSearch;

  urbanizaciones = signal<UrbanizacionDto[]>([]);
  editId = signal<number | null>(null);
  searchTerm = signal('');
  showModal = signal(false);
  editMode = signal(false);

  columns = [
    { key: 'id', label: 'N°' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'createdAt', label: 'Creado' },
    { key: 'updatedAt', label: 'Actualizado' },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  form: FormGroup;

  _notificationService = inject(NotificationService);

  constructor(private urbanizacionService: UrbanizacionService, private fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      ubicacion: ['', Validators.required],
      descripcion: [''],
    });

    this.loadUrbanizaciones();
  }

  // cargar datos
  loadUrbanizaciones() {
    this.urbanizacionService.getAll(this.currentPage(), this.pageSize()).subscribe((res) => {
      this.urbanizaciones.set(res.data);
      this.total.set(res.total);

      if (this.sortColumn()) this.ordenarUrbanizaciones();
    });
  }

  // búsqueda
  filteredUrbanizaciones = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.urbanizaciones().filter(
      (u) =>
        u.nombre.toLowerCase().includes(term) ||
        u.ubicacion.toLowerCase().includes(term) ||
        (u.descripcion ?? '').toLowerCase().includes(term)
    );
  });

  // crear/editar
  submit() {
    if (this.form.invalid) return;
    const data = this.form.value;

    if (this.editMode()) {
      const id = this.editId();
      if (id != null) {
        this.urbanizacionService.update(id, data).subscribe(() => {
          this._notificationService.showSuccess(`Se ha actualizado la urbanización`);
          this.loadUrbanizaciones();
          this.cancelEdit();
        });
      }
    } else {
      this.urbanizacionService.create(data).subscribe(() => {
        this._notificationService.showSuccess(`Se ha creado la urbanización ${data.nombre}`);
        this.loadUrbanizaciones();
        this.cancelEdit();
      });
    }
  }

  edit(urbanizacion: UrbanizacionDto) {
    this.showModal.set(true);
    this.editMode.set(true);
    this.editId.set(urbanizacion.id!);
    this.form.patchValue(urbanizacion);
  }

  openModal() {
    this.showModal.set(true);
    this.editMode.set(false);
    this.form.reset();
  }

  cancelEdit() {
    this.showModal.set(false);
    this.editMode.set(false);
    this.editId.set(null);
    this.form.reset();
  }

  delete(data: any) {
    this._notificationService
      .confirmDelete(`Se eliminará la urbanización ${data.nombre}`)
      .then((result) => {
        if (result.isConfirmed) {
          this._notificationService.showSuccess('Eliminado correctamente');
          this.urbanizacionService.delete(data.id).subscribe(() => this.loadUrbanizaciones());
        }
      });
  }

  ordenarUrbanizaciones() {
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (!col) return;

    const arr = [...this.urbanizaciones()];

    arr.sort((a, b) => {
      const valA = a[col as keyof UrbanizacionDto];
      const valB = b[col as keyof UrbanizacionDto];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return dir === 'asc' ? (valA < valB ? -1 : 1) : valA < valB ? 1 : -1;
    });

    this.urbanizaciones.set(arr);
  }

  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.ordenarUrbanizaciones();
  }

  // Método para obtener clase de flecha (igual que en cotizaciones)
  getClaseFlecha(columna: string): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  // paginador
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
      this.loadUrbanizaciones();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
      this.loadUrbanizaciones();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadUrbanizaciones();
    }
  }

  totalPages() {
    return Math.ceil(this.total() / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.total() ? this.total() : end;
  }
}
