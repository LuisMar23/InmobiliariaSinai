import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
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
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { AuthService } from '../../../../components/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteDto, UrbanizacionGroup } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

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
  imports: [FontAwesomeModule, FormsModule, RouterModule, CommonModule],
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
  faFolderOpen = faFolderOpen;
  cargando = signal(true);
  error = signal<string | null>(null);
  urbanizaciones = signal<Urbanizacion[]>([]);
  busqueda = signal('');
  eliminandoId = signal<number | null>(null);
  lotes = signal<LoteDto[]>([]);
  faSignOut = faSignOutAlt;

  private authService = inject(AuthService);

  urbanizacionGroups = computed<UrbanizacionGroup[]>(() => {
    const q = this.busqueda().toLowerCase().trim();
    const todos = this.lotes();

    const filtrados = q
      ? todos.filter(
          (l) =>
            l.numeroLote.toLowerCase().includes(q) ||
            l.urbanizacion?.nombre.toLowerCase().includes(q) ||
            l.ciudad.toLowerCase().includes(q) ||
            l.manzano?.toLowerCase().includes(q),
        )
      : todos;

    const map = new Map<string, LoteDto[]>();
    filtrados.forEach((l) => {
      const key =
        l.esIndependiente || !l.urbanizacion ? 'Independientes' : l.urbanizacion.nombre.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });

    return Array.from(map.entries())
      .map(([urbanizacion, lotes]) => ({
        urbanizacion,
        uuid: lotes[0]?.urbanizacion?.uuid,
        ciudad: lotes[0]?.urbanizacion?.ciudad,
        ubicacion: lotes[0]?.urbanizacion?.ubicacion,
        independiente: !lotes[0]?.urbanizacion,
        lotes: lotes.sort((a, b) => a.numeroLote.localeCompare(b.numeroLote)),
      }))
      .sort((a, b) => {
        if (a.urbanizacion === 'Independientes') return 1;
        if (b.urbanizacion === 'Independientes') return -1;
        return a.urbanizacion.localeCompare(b.urbanizacion);
      });
  });

  totalLotes = computed(() => this.lotes().length);
  totalUrbanizaciones = computed(() => this.urbanizacionGroups().length);

  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private loteService = inject(LoteService);

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
    this.cargarLotes();
  }

  cargarLotes(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.loteService.getAll().subscribe({
      next: (lista: LoteDto[]) => {
        this.lotes.set(lista);
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar lotes');
        this.cargando.set(false);
      },
    });
  }
  contarEstado(lotes: LoteDto[], estado: string): number {
    return lotes.filter((l) => l.estado === estado).length;
  }
  private urbContext = inject(UrbanizacionContextService);

  // irALotes(uuid: string | undefined): void {
  //   if (!uuid) {
  //     this.router.navigate(['/lotes/lista'], { queryParams: { independientes: true } });
  //     return;
  //   }
  //   this.router.navigate(['/lotes/lista'], { queryParams: { urbanizacion: uuid } });
  // }
  irALotes(uuid: string | undefined): void {
    if (!uuid) {
      this.router.navigate(['/lotes/lista'], { queryParams: { independientes: true } });
      return;
    }

    // Guardar contexto antes de navegar
    const group = this.urbanizacionGroups().find((g) => g.uuid === uuid);
    if (group) {
      const urbId = group.lotes[0]?.urbanizacion?.id;
      if (urbId !== undefined) {
        this.urbContext.set({
          id: urbId,
          uuid: group.uuid!,
          nombre: group.urbanizacion,
          ciudad: group.ciudad ?? '',
        });
      }
    }

    this.router.navigate(['/dashboard']);

    this.router.navigate(['/dashboard']);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
