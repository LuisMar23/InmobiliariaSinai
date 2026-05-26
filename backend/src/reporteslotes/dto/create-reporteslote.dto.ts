export class LoteReporteDto {
  id: number;
  uuid: string;
  numeroLote: string;
  manzano: string | null;
  superficieM2: number;
  precioBase: number;
  ubicacion: string | null;
  ciudad: string;
  estado: string;
  esIndependiente: boolean;
  urbanizacion: {
    id: number;
    nombre: string;
    ubicacion: string;
  } | null;
}

export class ReporteLotesResponseDto {
  data: LoteReporteDto[];
  totalLotes: number;
  generadoEn: Date;
}

export class LoteDetalleDto extends LoteReporteDto {
  totalVentas: number;
  totalReservas: number;
  totalCotizaciones: number;
  encargado: string | null;
}

export class ReporteLotesDetalleResponseDto {
  data: LoteDetalleDto[];
  totalLotes: number;
  totalSuperficieM2: number;
  totalPrecioBase: number;
  generadoEn: Date;
}

export class ManzanoDto {
  manzano: string;
}