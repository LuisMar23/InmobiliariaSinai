export interface LoteDto {
  id: number;
  uuid: string;
  urbanizacionId: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
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
  };
}
