import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsDate,
  ValidateNested,
  IsPositive,
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
  PROPIEDAD = 'PROPIEDAD',
}

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
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

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
}

export class CreatePlanPagoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  monto_inicial: number;

  @IsInt()
  @Min(1)
  @IsPositive()
  plazo: number;

  @IsEnum(PeriodicidadPago)
  periodicidad: PeriodicidadPago;

  @IsDate()
  @Type(() => Date)
  fecha_inicio: Date;
}

export class CreateVentaDto {
  @IsInt()
  @IsPositive()
  clienteId: number;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  @IsPositive()
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

  @IsInt()
  @IsPositive()
  cajaId: number;

  @ValidateNested()
  @Type(() => CreatePlanPagoDto)
  plan_pago: CreatePlanPagoDto;
}

export class RegistrarPagoDto {
  @IsInt()
  @IsPositive()
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

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;
}

export class UpdatePlanPagoDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @IsPositive()
  plazo?: number;

  @IsOptional()
  @IsEnum(PeriodicidadPago)
  periodicidad?: PeriodicidadPago;
}

export class UpdateVentaDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @IsOptional()
  @IsEnum(TipoInmueble)
  inmuebleTipo?: TipoInmueble;

  @IsOptional()
  @IsInt()
  @IsPositive()
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