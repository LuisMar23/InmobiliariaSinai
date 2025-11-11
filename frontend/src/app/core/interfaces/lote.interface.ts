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

export interface CreateLoteDto {
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
  estado: string;
}

export interface UpdateLoteDto {
  urbanizacionId?: number;
  numeroLote?: string;
  superficieM2?: number;
  precioBase?: number;
  descripcion?: string;
  ubicacion?: string;
  ciudad?: string;
  latitud?: number;
  longitud?: number;
  esIndependiente?: boolean;
  estado?: string;
}

