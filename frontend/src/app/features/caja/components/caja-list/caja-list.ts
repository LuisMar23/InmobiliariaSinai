import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { AuthService } from '../../../../components/services/auth.service';
import { CajaService } from '../../service/caja.service';

interface ColumnConfig {
  key: keyof Caja;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-caja-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './caja-list.html',
})
export class CajaList implements OnInit {
  private cajaSvc = inject(CajaService);
  private fb = inject(FormBuilder);
  private authSvc = inject(AuthService);

  cajas = signal<Caja[]>([]);
  allCajas = signal<Caja[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  sortColumn = signal<keyof Caja>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'montoInicial', label: 'Monto Inicial', sortable: true },
    { key: 'saldoActual', label: 'Saldo Actual', sortable: true },
    { key: 'usuarioApertura', label: 'Usuario Apertura', sortable: true },
  ];

  form!: FormGroup;
  mostrarFormNuevaCaja = signal(false);

  filteredCajas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let cajas = this.allCajas();

    if (term) {
      cajas = cajas.filter(
        (caja: Caja) =>
          caja.nombre.toLowerCase().includes(term) ||
          caja.estado.toLowerCase().includes(term) ||
          caja.usuarioApertura?.fullName?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return cajas;

    return [...cajas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (column === 'usuarioApertura') {
        aValue = a.usuarioApertura?.fullName;
        bValue = b.usuarioApertura?.fullName;
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  });

  ngOnInit(): void {
    this.obtenerCajas();
    this.inicializarForm();
  }

  inicializarForm() {
    // Usar usuario por defecto para pruebas
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      montoInicial: [0, [Validators.required, Validators.min(0)]],
      usuarioAperturaId: [1, Validators.required],
    });
  }

  obtenerCajas() {
    this.cargando.set(true);
    this.error.set(null);
    this.cajaSvc.cargarCajas();

    // Simular carga de datos
    setTimeout(() => {
      this.cajas.set(this.cajaSvc.cajas());
      this.allCajas.set(this.cajaSvc.cajas());
      this.cargando.set(false);
    }, 1000);
  }

  crearCaja() {
    if (this.form.invalid) return;

    this.cajaSvc.crearCaja(this.form.value);
    this.form.reset({
      montoInicial: 0,
      usuarioAperturaId: 1,
    });
    this.mostrarFormNuevaCaja.set(false);
  }

  abrirCaja(caja: Caja) {
    const montoInicial = prompt('Ingrese el monto inicial:');
    if (montoInicial && !isNaN(Number(montoInicial))) {
      this.cajaSvc.abrirCaja(caja.id, Number(montoInicial));
    }
  }

  cerrarCaja(caja: Caja) {
    if (confirm(`¿Está seguro que desea cerrar la caja ${caja.nombre}?`)) {
      this.cajaSvc.cerrarCaja(caja.id);
    }
  }

  cambiarOrden(columna: keyof Caja) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof Caja): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      ABIERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CERRADA: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
    };
    return classes[estado as keyof typeof classes] || classes['CERRADA'];
  }

  getDiferencia(caja: Caja): number {
    return caja.saldoActual - caja.montoInicial;
  }

  getCajasAbiertas(): number {
    return this.cajas().filter((c) => c.estado === 'ABIERTA').length;
  }

  getCajasCerradas(): number {
    return this.cajas().filter((c) => c.estado === 'CERRADA').length;
  }

  getTotalEnCajas(): number {
    return this.cajas().reduce((sum, c) => sum + c.saldoActual, 0);
  }

  toggleFormNuevaCaja() {
    this.mostrarFormNuevaCaja.set(!this.mostrarFormNuevaCaja());
  }

  tienePermisoAdmin(): boolean {
    const user = this.authSvc.getCurrentUser();
    return user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';
  }
}
