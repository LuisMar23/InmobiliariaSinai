import {
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
  Min,
  IsEnum,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
}

export class UpdatePagoPlanDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto?: number;

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

  @IsOptional()
  @IsInt()
  @IsPositive()
  cajaId?: number;
}
