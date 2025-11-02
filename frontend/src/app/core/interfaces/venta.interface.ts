// venta.interface.ts
export interface VentaDto {
  id: number;
  uuid: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  precioFinal: number;
  estado: string;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: number;
    fullName: string;
    email: string;
    telefono: string;
    ci: string;
    role: string;
  };
  asesor?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
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
  planPago?: PlanPagoDto;
  _count?: {
    pagos: number;
    documentos: number;
  };
}

export interface PlanPagoDto {
  id_plan_pago?: number;
  uuid?: string;
  ventaId?: number;
  total: number;
  monto_inicial: number;
  plazo: number;
  periodicidad: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  estado: string;
  pagos?: PagoPlanDto[];
  saldo_pendiente?: number;
  total_pagado?: number;
  porcentaje_pagado?: number;
  monto_cuota?: number;
}

export interface PagoPlanDto {
  id_pago_plan?: number;
  uuid?: string;
  plan_pago_id: number;
  monto: number;
  fecha_pago?: string;
  observacion?: string;
}

export interface CreateVentaDto {
  clienteId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  precioFinal: number;
  estado?: string;
  observaciones?: string;
  plan_pago: CreatePlanPagoDto;
}

export interface CreatePlanPagoDto {
  monto_inicial: number;
  plazo: number;
  periodicidad: string;
  fecha_inicio: string;
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
}
