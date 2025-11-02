// pago-plan.dto.ts
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from './create-venta.dto';

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
}
