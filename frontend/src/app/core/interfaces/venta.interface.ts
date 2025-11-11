export interface VentaDto {
  id: number;
  uuid?: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  precioFinal: number;
  estado: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
  cliente?: {
    id: number;
    fullName: string;
    ci?: string;
    email?: string;
    telefono?: string;
  };
  asesor?: {
    id: number;
    fullName: string;
    email?: string;
    telefono?: string;
  };
  lote?: {
    id: number;
    numeroLote: string;
    superficieM2: number;
    precioBase: number;
    estado: string;
    urbanizacion?: {
      id: number;
      nombre: string;
      ubicacion: string;
    };
  };
  planPago?: {
    id_plan_pago: number;
    ventaId: number;
    total: number;
    monto_inicial: number;
    plazo: number;
    periodicidad: string;
    fecha_inicio: string;
    fecha_vencimiento: string;
    estado: string;
    creado_en?: string;
    actualizado_en?: string;
    pagos: PagoPlanPago[];
    saldo_pendiente?: number;
    total_pagado?: number;
    porcentaje_pagado?: number;
    monto_cuota?: number;
    dias_restantes?: number;
  };
  archivos?: any[];
  ingresos?: any[];
  cajaId?: number;
  caja?: {
    id: number;
    nombre: string;
    saldoActual: number;
  };
}

export interface CreateVentaDto {
  clienteId: string;
  inmuebleTipo: string;
  inmuebleId: string;
  precioFinal: number;
  cajaId: string;
  estado?: string;
  observaciones?: string;
  plan_pago: {
    monto_inicial: number;
    plazo: number;
    periodicidad: string;
    fecha_inicio: string;
  };
}

export interface UpdateVentaDto {
  clienteId?: number;
  inmuebleTipo?: string;
  inmuebleId?: number;
  precioFinal?: number;
  estado?: string;
  observaciones?: string;
}

export interface RegistrarPagoDto {
  plan_pago_id: number;
  monto: number;
  fecha_pago?: string;
  observacion?: string;
  metodoPago?: string;
  cajaId: string;
}

export interface PagoPlanPago {
  id_pago_plan: number;
  plan_pago_id: number;
  monto: number;
  fecha_pago: string;
  observacion?: string;
  metodoPago?: string;
  creado_en?: string;
}
