export interface Caja {
  id: number;
  nombre: string;
  montoInicial: number;
  saldoActual: number;
  estado: 'ABIERTA' | 'CERRADA';
  usuarioAperturaId: number;
  usuarioApertura?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  creadoEn?: string;
}

export interface CierreCaja {
  id: number;
  cajaId: number;
  usuarioId: number;
  tipo: 'TOTAL' | 'PARCIAL';
  saldoInicial: number;
  saldoFinal: number;
  saldoReal: number;
  diferencia: number;
  observaciones?: string;
  fechaCierre: string;
  usuario?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  caja?: {
    id: number;
    nombre: string;
  };
}

export interface Movimiento {
  id: number;
  cajaId: number;
  usuarioId: number;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  descripcion?: string;
  metodoPago: string;
  referencia?: string;
  fecha: string;
  usuario?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  caja?: {
    id: number;
    nombre: string;
  };
}
