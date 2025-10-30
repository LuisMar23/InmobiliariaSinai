import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoReserva {
  ACTIVA = 'ACTIVA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
  CONVERTIDA_EN_VENTA = 'CONVERTIDA_EN_VENTA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  URBANIZACION = 'URBANIZACION',
}

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  ASESOR = 'ASESOR',
  SECRETARIA = 'SECRETARIA',
  CLIENTE = 'CLIENTE',
  USUARIO = 'USUARIO',
}

export class CreateReservaDto {
  @IsInt()
  @Min(1)
  clienteId: number;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  @Min(1)
  inmuebleId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  montoReserva: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaVencimiento: string;

  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;
}

export class UpdateReservaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  clienteId?: number;

  @IsOptional()
  @IsEnum(TipoInmueble)
  inmuebleTipo?: TipoInmueble;

  @IsOptional()
  @IsInt()
  @Min(1)
  inmuebleId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  montoReserva?: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;
}
