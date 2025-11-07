// src/app/core/interfaces/lote.interface.ts
export interface LoteDto {
  id: number;
  uuid: string;
  urbanizacionId?: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  precioActual?: number;
  tienePromocionActiva?: boolean;
  promocionActiva?: {
    id: number;
    titulo: string;
    descuento: number;
    fechaFin: string;
  };
  descripcion?: string;
  ubicacion?: string;
  ciudad: string;
  latitud?: number;
  longitud?: number;
  esIndependiente: boolean;
  estado: string;
  createdAt: string;
  updatedAt: string;
  urbanizacion?: {
    id: number;
    nombre: string;
    ubicacion: string;
    ciudad: string;
  };
  LotePromocion?: Array<{
    id: number;
    promocion: {
      id: number;
      titulo: string;
      descuento: number;
      fechaInicio: string;
      fechaFin: string;
    };
  }>;
  _count?: {
    cotizaciones: number;
    ventas: number;
    reservas: number;
    visitas: number;
    archivos: number;
  };
}

export interface UrbanizacionDto {
  id?: number;
  uuid?: string;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  _count?: {
    lotes: number;
  };
}
