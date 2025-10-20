import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export class CreateLoteDto {
  @IsInt()
  urbanizacionId: number;

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
  @IsInt()
  usuarioId?: number;
}
