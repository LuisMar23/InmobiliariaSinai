export interface LoteDto {
  id: number;
  uuid: string;
  urbanizacionId: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  descripcion?: string;
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  createdAt: string;
  updatedAt: string;
  urbanizacion?: {
    id: number;
    nombre: string;
    ubicacion: string;
  };
  _count?: {
    cotizaciones: number;
    ventas: number;
    reservas: number;
    visitas: number;
    imagenes: number;
  };
}
