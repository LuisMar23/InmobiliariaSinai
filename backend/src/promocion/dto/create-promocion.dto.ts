// src/promocion/dto/create-promocion.dto.ts
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromocionDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  @Type(() => Number)
  descuento: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  lotesIds?: number[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  urbanizacionId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;
}
