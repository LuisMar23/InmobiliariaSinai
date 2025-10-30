import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  URBANIZACION = 'URBANIZACION',
}

export enum EstadoVenta {
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  PAGADO = 'PAGADO',
  CANCELADO = 'CANCELADO',
}

export enum PeriodicidadPago {
  DIAS = 'DIAS',
  SEMANAS = 'SEMANAS',
  MESES = 'MESES',
}

export enum EstadoPlanPago {
  ACTIVO = 'ACTIVO',
  PAGADO = 'PAGADO',
  MOROSO = 'MOROSO',
  CANCELADO = 'CANCELADO',
}

export class CreatePlanPagoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  monto_inicial: number;

  @IsInt()
  @Min(1)
  plazo: number;

  @IsEnum(PeriodicidadPago)
  periodicidad: PeriodicidadPago;

  @IsDate()
  @Type(() => Date)
  fecha_inicio: Date;
}

export class CreateVentaDto {
  @IsInt()
  clienteId: number;

  @IsInt()
  asesorId: number;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  inmuebleId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioFinal: number;

  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePlanPagoDto)
  plan_pago?: CreatePlanPagoDto;
}

export class RegistrarPagoDto {
  @IsInt()
  plan_pago_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_pago?: Date;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class UpdateVentaDto {
  @IsOptional()
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @IsEnum(TipoInmueble)
  inmuebleTipo?: TipoInmueble;

  @IsOptional()
  @IsInt()
  inmuebleId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioFinal?: number;

  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
