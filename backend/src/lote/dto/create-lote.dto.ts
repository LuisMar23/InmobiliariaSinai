import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export class CreateLoteDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  urbanizacionId?: number;

  @IsString()
  numeroLote: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  superficieM2: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioBase: number;

  @IsOptional()
  @IsEnum(EstadoInmueble)
  estado?: EstadoInmueble;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsString()
  ciudad: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Type(() => Number)
  latitud?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Type(() => Number)
  longitud?: number;

  @IsBoolean()
  @Type(() => Boolean)
  esIndependiente: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  encargadoId?: number;
}