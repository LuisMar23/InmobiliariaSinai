import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUrbanizacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
