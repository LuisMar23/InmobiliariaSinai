export interface UrbanizacionDto {
  id?: number;
  uuid?: string |undefined;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  maps?: string; // URL de Google Maps
  createdAt?: Date;
  updatedAt?: Date;
  archivos?: any;
  _count?: {
    lotes: number;
  };
}

export interface CreateUrbanizacionDto {
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  maps?: string; // URL de Google Maps
}

export interface UpdateUrbanizacionDto {
  nombre?: string;
  ubicacion?: string;
  ciudad?: string;
  descripcion?: string;
  maps?: string; // URL de Google Maps
}

export interface CiudadGroup {
  ciudad: string;
  urbanizaciones: UrbanizacionDto[];  // ← cambia Urbanizacion[] por UrbanizacionDto[]
}