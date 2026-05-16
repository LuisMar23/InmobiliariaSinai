import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faMapMarkerAlt,
  faBuilding,
  faEdit,
  faTrash,
  faThLarge,
  faSearch,
  faSpinner,
  faPlus,
  faFolderOpen,
} from '@fortawesome/free-solid-svg-icons';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { AuthService } from '../../../../components/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

export interface Urbanizacion {
  id: number;
  uuid: string;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  maps?: string;
  createdAt: string;
  _count?: { lotes: number };
}

export interface CiudadGroup {
  ciudad: string;
  urbanizaciones: Urbanizacion[];
}

@Component({
  selector: 'app-urbanizacion-list',
  imports: [FontAwesomeModule,FormsModule],
  templateUrl: './urbanizacion-list.html',
  styleUrl: './urbanizacion-list.css',
})
export class UrbanizacionList {
  faMapMarkerAlt = faMapMarkerAlt;
  faBuilding = faBuilding;
  faEdit = faEdit;
  faTrash = faTrash;
  faThLarge = faThLarge;
  faSearch = faSearch;
  faSpinner = faSpinner;
  faPlus = faPlus;
faFolderOpen=faFolderOpen;
  cargando = signal(true);
  error = signal<string | null>(null);
  urbanizaciones = signal<Urbanizacion[]>([]);
  busqueda = signal('');
  eliminandoId = signal<number | null>(null);

ciudadGroups = computed<CiudadGroup[]>(() => {
  const q = this.busqueda().toLowerCase().trim();
  const todas = this.urbanizaciones();

  const filtradas = q
    ? todas.filter(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.ciudad.toLowerCase().includes(q) ||
          u.ubicacion?.toLowerCase().includes(q),
      )
    : todas;

  const map = new Map<string, Urbanizacion[]>();
  filtradas.forEach((u) => {
    const ciudad = u.ciudad?.trim() || 'Sin ciudad';
    if (!map.has(ciudad)) map.set(ciudad, []);
    map.get(ciudad)!.push(u);
  });

  return Array.from(map.entries())
    .map(([ciudad, urbanizaciones]) => ({
      ciudad,
      urbanizaciones: urbanizaciones.sort((a, b) => a.nombre.localeCompare(b.nombre)), // <-- orden alfabético dentro de cada grupo
    }))
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad)); // ciudades también alfabético
});

  totalUrbanizaciones = computed(() => this.urbanizaciones().length);
  totalCiudades = computed(() => this.ciudadGroups().length);

  private urbanizacionService = inject(UrbanizacionService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Paleta de colores por índice de ciudad
  readonly COLORES = [
    { bg: '#E6F1FB', border: '#B5D4F4', text: '#185FA5' },
    { bg: '#E1F5EE', border: '#9FE1CB', text: '#0F6E56' },
    { bg: '#FAEEDA', border: '#FAC775', text: '#854F0B' },
    { bg: '#FBEAF0', border: '#F4C0D1', text: '#993556' },
    { bg: '#EAF3DE', border: '#C0DD97', text: '#3B6D11' },
  ];

  getColor(index: number) {
    return this.COLORES[index % this.COLORES.length];
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
  }

  cargarUrbanizaciones(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.urbanizacionService.getAll().subscribe({
      next: (res: any) => {
        const lista: Urbanizacion[] = res.data ?? res;
        this.urbanizaciones.set(lista);
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar urbanizaciones');
        this.cargando.set(false);
      },
    });
  }

irALotes(uuid: string): void {
  this.router.navigate(['/lotes/lista'], { queryParams: { urbanizacion: uuid } });
}

  
}
