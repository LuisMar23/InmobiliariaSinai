import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, UserRole } from './dto/register.dto'; // 👈 Importamos UserRole desde el DTO
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, fullName, ci, telefono, role } =
      registerDto;

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedUsername = username.toLowerCase().trim();
      const normalizedCi = ci.trim();
      const normalizedTelefono = telefono.trim();
      const userRole = role || UserRole.CLIENTE; // Usa CLIENTE por defecto

      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            { username: normalizedUsername },
            { ci: normalizedCi },
            { telefono: normalizedTelefono },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === normalizedEmail) {
          throw new ConflictException('El email ya está registrado');
        }
        if (existingUser.username === normalizedUsername) {
          throw new ConflictException('El nombre de usuario ya existe');
        }
        if (existingUser.ci === normalizedCi) {
          throw new ConflictException('El CI ya está registrado');
        }
        if (existingUser.telefono === normalizedTelefono) {
          throw new ConflictException('El teléfono ya está registrado');
        }
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await this.prisma.user.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          passwordHash: hashedPassword,
          fullName: fullName.trim(),
          ci: normalizedCi,
          telefono: normalizedTelefono,
          isActive: true,
          role: userRole, // ✅ Aquí se usa el role
        },
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      const tokens = await this.generateTokens(user.id, user.email);

      await this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          accion: 'REGISTRO',
          tablaAfectada: 'User',
          registroId: user.id,
          datosDespues: JSON.stringify({
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Usuario registrado correctamente',
        data: {
          user,
          ...tokens,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    try {
      const normalizedIdentifier = identifier.toLowerCase().trim();

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              email: {
                equals: normalizedIdentifier,
                mode: 'insensitive',
              },
            },
            {
              username: {
                equals: normalizedIdentifier,
                mode: 'insensitive',
              },
            },
          ],
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const now = new Date();
      if (user.lockUntil && user.lockUntil > now) {
        const diffMs = user.lockUntil.getTime() - now.getTime();
        const diffMin = Math.ceil(diffMs / (1000 * 60));
        throw new UnauthorizedException(
          `Cuenta bloqueada. Intenta nuevamente en ${diffMin} minutos.`,
        );
      }

      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      } catch (bcryptError) {
        console.error('Error comparing passwords:', bcryptError);
        throw new UnauthorizedException('Error validando credenciales');
      }

      if (!isPasswordValid) {
        const failedAttempts = (user.failedAttempts || 0) + 1;
        const lockUntil =
          failedAttempts >= 5 ? new Date(now.getTime() + 5 * 60 * 1000) : null;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts,
            lockUntil,
          },
        });

        const message =
          failedAttempts >= 5
            ? 'Demasiados intentos fallidos. Tu cuenta se bloqueó por 5 minutos.'
            : 'Credenciales inválidas';

        throw new UnauthorizedException(message);
      }

      if (user.failedAttempts > 0 || user.lockUntil) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockUntil: null,
            lastLogin: now,
          },
        });
      }

      const tokens = await this.generateTokens(user.id, user.email);

      await this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          accion: 'LOGIN',
          tablaAfectada: 'User',
          registroId: user.id,
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
          },
          ...tokens,
        },
      };
    } catch (error) {
      console.error('Error completo en login service:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-secret-key',
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const tokens = await this.generateTokens(payload.sub, payload.email);

      return {
        success: true,
        message: 'Token refrescado correctamente',
        data: tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        isActive: true,
      },
      select: {
        id: true,
        uuid: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  private async generateTokens(userId: number, email: string) {
    const payload = {
      sub: userId,
      email: email.toLowerCase(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        secret: process.env.JWT_SECRET || 'default-secret-key',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'default-secret-key',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
