import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContactoDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  ci: string;

  @IsOptional()
  @IsString()
  @IsIn(['Hombre', 'Mujer', 'Otro'])
  genero?: string;

  @IsString()
  telefono: string;

  @IsOptional()
  @IsString()
  ocupacion?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  domicilio?: string;

  @IsOptional()
  @Type(() => Number)
  usuarioId?: number;
}
