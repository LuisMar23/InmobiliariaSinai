// src/app/core/models/interfaces.ts

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO'
}

export interface Urbanizacion {
  id: number;
  uuid: string;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  archivos?: any;
  createdAt: Date;
  updatedAt: Date;
  lotes?:any
  _count?: {
    lotes: number;
  };
}

export interface Promocion {
  id: number;
  uuid: string;
  titulo: string;
  descripcion?: string;
  descuento: number;
  fechaInicio: Date;
  fechaFin: Date;
  urbanizacionId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LotePromocion {
  id: number;
  uuid: string;
  loteId: number;
  promocionId: number;
  precioOriginal: number;
  precioConDescuento: number;
  promocion?: Promocion;
}

export interface Archivo {
  id: number;
  uuid: string;
  url: string;
  tipo: string;
  nombre: string;
}

export interface Lote {
  id: number;
  uuid: string;
  urbanizacionId?: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  descripcion?: string;
  ubicacion?: string;
  ciudad: string;
  latitud?: number;
  longitud?: number;
  esIndependiente: boolean;
  estado: EstadoInmueble;
  createdAt: Date;
  updatedAt: Date;
  urbanizacion?: Urbanizacion;
  archivos?: any;
  LotePromocion?: LotePromocion[];
}

export interface FiltrosLote {
  ciudad: string;
  precioMin: number;
  precioMax: number;
  superficieMin: number;
  superficieMax: number;
  urbanizacionId?: number;
  estado: EstadoInmueble | '';
  busqueda: string;
}

export type VistaLote = 'grid' | 'list' | 'map';