import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  ASESOR = 'ASESOR',
  SECRETARIA = 'SECRETARIA',
  CLIENTE = 'CLIENTE',
  USUARIO = 'USUARIO',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  username: string;

  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un símbolo.',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'El CI es requerido' })
  ci: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  telefono: string;

  @IsOptional()
  @IsEnum(UserRole, {
    message:
      'Rol inválido. Valores permitidos: ADMINISTRADOR, ASESOR, SECRETARIA, CLIENTE, USUARIO',
  })
  role: UserRole;
}
