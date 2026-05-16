// dto/create-egreso.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEgresoDto {
  @IsString()
  descripcion: string;

  @IsNumber()
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoriaId?: number;
  @IsNumber()
  @Type(() => Number)
  cajaId: number;

  @IsOptional()
  @IsEnum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'])
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
}

// dto/update-egreso.dto.ts
export class UpdateEgresoDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monto?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoriaId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cajaId?: number;

  @IsOptional()
  @IsEnum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'])
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
}

// dto/filtros-egreso.dto.ts
export class FiltrosEgresoDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  categoriaId?: number;

  @IsOptional()
  cajaId?: number;

  @IsOptional()
  usuarioId?: number;
}
