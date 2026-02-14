import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoVenta } from './create-venta.dto';

export class UpdateVentaDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  clienteId?: number;

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
