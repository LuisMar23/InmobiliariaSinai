// src/app/core/interfaces/urbanizacion.interface.ts
export interface UrbanizacionDto {
  id?: number;
  uuid?: string;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  createdAt?: Date;
  updatedAt?: Date;
   archivos?:any;

  _count?: {
    lotes: number;
  };
}

export interface CreateUrbanizacionDto {
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
}

export interface UpdateUrbanizacionDto {
  nombre?: string;
  ubicacion?: string;
  ciudad?: string;
  descripcion?: string;
}
