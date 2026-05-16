import { IsOptional, IsString, IsEnum, IsNumberString, IsDateString } from 'class-validator';
import { TipoInmueble } from '../../../generated/prisma';

export class FiltrosReporteDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  manzano?: string;

  @IsOptional()
  @IsEnum({ ...TipoInmueble, TODOS: 'TODOS' })
  tipoVenta?: TipoInmueble | 'TODOS';

  @IsOptional()
  @IsNumberString()
  asesorId?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;
}

export class FiltrosClienteDto {
  @IsNumberString()
  clienteId: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}