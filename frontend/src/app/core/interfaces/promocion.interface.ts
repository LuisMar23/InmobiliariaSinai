export interface PromocionDto {
  id: number;
  uuid: string;
  titulo: string;
  descripcion?: string;
  descuento: number;
  fechaInicio: string;
  fechaFin: string;
  aplicaA: string;
  createdAt: string;
  updatedAt: string;
}
