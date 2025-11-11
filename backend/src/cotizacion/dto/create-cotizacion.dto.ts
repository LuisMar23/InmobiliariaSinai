import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoCotizacion {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  URBANIZACION = 'URBANIZACION',
}

export class CreateCotizacionDto {
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
  precioOfertado: number;

  @IsOptional()
  @IsEnum(EstadoCotizacion)
  estado?: EstadoCotizacion;
}
