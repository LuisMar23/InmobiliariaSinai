import { Injectable, signal, computed } from '@angular/core';

export interface UrbanizacionActiva {
  id: number;
  uuid: string;
  nombre: string;
  ciudad: string;
}

@Injectable({ providedIn: 'root' })
export class UrbanizacionContextService {
  private _urbanizacion = signal<UrbanizacionActiva | null>(null);

  readonly urbanizacion = this._urbanizacion.asReadonly();

  // Computed para saber si estamos en modo independientes (id = -1)
  readonly esModoIndependientes = computed(() => {
    const urb = this._urbanizacion();
    return urb !== null && urb.id === -1;
  });

  get urbanizacionId(): number | null {
    return this._urbanizacion()?.id ?? null;
  }

  set(urb: UrbanizacionActiva) {
    this._urbanizacion.set(urb);
    localStorage.setItem('urbanizacion_activa', JSON.stringify(urb));
  }

  // Nuevo método para seleccionar "Independientes"
  setIndependientes() {
    const independientes: UrbanizacionActiva = {
      id: -1,
      uuid: 'independientes',
      nombre: 'Independientes',
      ciudad: 'Sin ciudad',
    };
    this._urbanizacion.set(independientes);
    localStorage.setItem('urbanizacion_activa', JSON.stringify(independientes));
  }

  recuperar() {
    const stored = localStorage.getItem('urbanizacion_activa');
    if (stored) this._urbanizacion.set(JSON.parse(stored));
  }

  limpiar() {
    this._urbanizacion.set(null);
    localStorage.removeItem('urbanizacion_activa');
  }
}
