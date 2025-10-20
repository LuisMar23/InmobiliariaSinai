import { IsString, IsNumber, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  URBANIZACION = 'URBANIZACION',
}

export enum EstadoVenta {
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  PAGADO = 'PAGADO',
  CANCELADO = 'CANCELADO',
}

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  ASESOR = 'ASESOR',
  SECRETARIA = 'SECRETARIA',
  CLIENTE = 'CLIENTE',
}

export class CreateVentaDto {
  @IsInt()
  clienteId: number;

  @IsInt()
  asesorId: number;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  inmuebleId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioFinal: number;

  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @IsOptional()
  @IsInt()
  usuarioId?: number;
}