import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faShieldHalved, faKey, faBuilding, faCubes,
  faSave, faSpinner, faChevronDown, faChevronUp,
  faCheck, faTimes, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UrbanizacionService } from '../../urbanizacion/services/urbanizacion.service';
import { UserService } from '../../users/services/users.service';
import { SeguridadService } from '../service/seguridad.service';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './seguridad-component.html',
})
export class SeguridadComponent implements OnInit {
  // Icons
  faShieldHalved = faShieldHalved;
  faKey          = faKey;
  faBuilding     = faBuilding;
  faCubes        = faCubes;
  faSave         = faSave;
  faSpinner      = faSpinner;
  faChevronDown  = faChevronDown;
  faChevronUp    = faChevronUp;
  faCheck        = faCheck;
  faTimes        = faTimes;
  faUsers        = faUsers;

  // Services
  private seguridadService    = inject(SeguridadService);
  private authService         = inject(AuthService);
  private urbanizacionService = inject(UrbanizacionService);
  private userService         = inject(UserService);
  private notification        = inject(NotificationService);

  // ── Tab activo ──────────────────────────────────────────────
  tabActivo = signal<'permisos' | 'urbanizaciones' | 'modulos'>('permisos');

  // ── Permisos ─────────────────────────────────────────────────
  roles = ['ADMINISTRADOR', 'ASESOR', 'SECRETARIA', 'USUARIO'];
  roleSeleccionado = signal<string>('ADMINISTRADOR');
  modulos          = signal<any[]>([]);
  permisosActuales = signal<Record<number, any>>({});  // moduloId → permisos
  guardandoPermisos = signal(false);
  cargandoPermisos  = signal(false);

  // ── Urbanizaciones ───────────────────────────────────────────
  usuarios              = signal<any[]>([]);
  usuarioSeleccionado   = signal<any>(null);
  todasUrbanizaciones   = signal<any[]>([]);
  urbAsignadas          = signal<any[]>([]);
  guardandoUrb          = signal(false);
  cargandoUrb           = signal(false);
  urbParaAgregar        = signal<number | null>(null);

  // ── Módulos (vista) ──────────────────────────────────────────
  modulosExpanded = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.cargarModulos();
    this.cargarPermisosPorRole(this.roleSeleccionado());
    this.cargarUsuarios();
    this.cargarTodasUrbanizaciones();
  }

  // ============================================================
  // TABS
  // ============================================================

  cambiarTab(tab: 'permisos' | 'urbanizaciones' | 'modulos'): void {
    this.tabActivo.set(tab);
  }

  // ============================================================
  // MÓDULOS
  // ============================================================

  cargarModulos(): void {
    this.seguridadService.getModulos().subscribe({
      next: (res) => this.modulos.set(res.data?.modulos ?? []),
      error: () => this.notification.showError('Error al cargar módulos'),
    });
  }

  toggleModulo(id: number): void {
    const set = new Set(this.modulosExpanded());
    set.has(id) ? set.delete(id) : set.add(id);
    this.modulosExpanded.set(set);
  }

  isExpanded(id: number): boolean {
    return this.modulosExpanded().has(id);
  }

  // ============================================================
  // PERMISOS
  // ============================================================

  seleccionarRole(role: string): void {
    this.roleSeleccionado.set(role);
    this.cargarPermisosPorRole(role);
  }

  cargarPermisosPorRole(role: string): void {
    this.cargandoPermisos.set(true);
    this.seguridadService.getPermisosPorRole(role).subscribe({
      next: (res) => {
        const map: Record<number, any> = {};

        // Primero inicializa todos los módulos en false
        this.modulos().forEach((m) => {
          map[m.id] = { moduloId: m.id, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };
          m.hijos?.forEach((h: any) => {
            map[h.id] = { moduloId: h.id, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };
          });
        });

        // Sobreescribe con los que vienen del backend
        (res.data?.permisos ?? []).forEach((p: any) => {
          map[p.moduloId] = {
            moduloId:      p.moduloId,
            puedeVer:      p.puedeVer,
            puedeCrear:    p.puedeCrear,
            puedeEditar:   p.puedeEditar,
            puedeEliminar: p.puedeEliminar,
          };
        });

        this.permisosActuales.set(map);
        this.cargandoPermisos.set(false);
      },
      error: () => {
        this.notification.showError('Error al cargar permisos');
        this.cargandoPermisos.set(false);
      },
    });
  }

  getPermiso(moduloId: number): any {
    return this.permisosActuales()[moduloId] ?? {
      moduloId, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false,
    };
  }

  togglePermiso(moduloId: number, tipo: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'): void {
    const map = { ...this.permisosActuales() };
    if (!map[moduloId]) {
      map[moduloId] = { moduloId, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };
    }
    map[moduloId] = { ...map[moduloId], [tipo]: !map[moduloId][tipo] };

    // Si activas crear/editar/eliminar, activa ver también
    if (tipo !== 'puedeVer' && map[moduloId][tipo]) {
      map[moduloId].puedeVer = true;
    }
    // Si desactivas ver, desactiva todo
    if (tipo === 'puedeVer' && !map[moduloId][tipo]) {
      map[moduloId] = { moduloId, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };
    }

    this.permisosActuales.set(map);
  }

  guardarPermisos(): void {
    this.guardandoPermisos.set(true);
    const permisos = Object.values(this.permisosActuales());

    this.seguridadService.updatePermisosRole(this.roleSeleccionado(), permisos).subscribe({
      next: () => {
        this.guardandoPermisos.set(false);
        this.notification.showSuccess(`Permisos de ${this.roleSeleccionado()} guardados correctamente`);
      },
      error: () => {
        this.guardandoPermisos.set(false);
        this.notification.showError('Error al guardar permisos');
      },
    });
  }

  // ============================================================
  // URBANIZACIONES POR USUARIO
  // ============================================================

  cargarUsuarios(): void {
    this.userService.getAll().subscribe({
      next: (res) => this.usuarios.set(res.data?.users ?? []),
      error: () => {},
    });
  }

  cargarTodasUrbanizaciones(): void {
    this.urbanizacionService.getAll().subscribe({
      next: (res) => this.todasUrbanizaciones.set(res.data),
      error: () => {},
    });
  }

  seleccionarUsuario(usuario: any): void {
    this.usuarioSeleccionado.set(usuario);
    this.cargandoUrb.set(true);
    this.seguridadService.getUrbanizacionesUsuario(usuario.id).subscribe({
      next: (res) => {
        this.urbAsignadas.set(res.data?.urbanizaciones ?? []);
        this.cargandoUrb.set(false);
      },
      error: () => this.cargandoUrb.set(false),
    });
  }

  get urbDisponibles(): any[] {
    const asignadasIds = this.urbAsignadas().map((u) => u.id);
    return this.todasUrbanizaciones().filter((u) => !asignadasIds.includes(u.id));
  }

  agregarUrbanizacion(): void {
    const id = this.urbParaAgregar();
    if (!id || !this.usuarioSeleccionado()) return;

    const urb = this.todasUrbanizaciones().find((u) => u.id === id);
    if (!urb) return;

    this.urbAsignadas.set([...this.urbAsignadas(), urb]);
    this.urbParaAgregar.set(null);
  }

  quitarUrbanizacion(urbId: number): void {
    this.urbAsignadas.set(this.urbAsignadas().filter((u) => u.id !== urbId));
  }

  guardarUrbanizaciones(): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;

    this.guardandoUrb.set(true);
    const ids = this.urbAsignadas().map((u) => u.id);

    this.seguridadService.asignarUrbanizaciones(usuario.id, ids).subscribe({
      next: () => {
        this.guardandoUrb.set(false);
        this.notification.showSuccess('Urbanizaciones guardadas correctamente');
      },
      error: () => {
        this.guardandoUrb.set(false);
        this.notification.showError('Error al guardar urbanizaciones');
      },
    });
  }
}