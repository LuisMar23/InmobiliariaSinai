import { IsString, IsOptional, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGrupoDto {
  @IsString()
  tipoUsuario: string;

  @IsOptional()
  @IsString()
  nombreEmpresa?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Type(() => Number)
  sedeId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;
}
