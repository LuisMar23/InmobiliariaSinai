import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, fullName, ci, telefono } = registerDto;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

    if (!passwordRegex.test(password)) {
      throw new ConflictException(
        'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un símbolo.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('El usuario o email ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        ci,
        telefono,
      },
      select: {
        id: true,
        uuid: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      data: {
        user,
        ...tokens,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('El usuario o correo no existe');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const diffMs = user.lockUntil.getTime() - new Date().getTime();
      const diffMin = Math.ceil(diffMs / (1000 * 60));
      throw new UnauthorizedException(
        `Demasiados intentos fallidos. Intenta nuevamente en ${diffMin} minutos.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const failedAttempts = user.failedAttempts + 1;
      let lockUntil: Date | null = null;

      if (failedAttempts >= 5) {
        lockUntil = new Date(Date.now() + 5 * 60 * 1000);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts,
          lockUntil,
        },
      });

      throw new UnauthorizedException(
        failedAttempts >= 5
          ? 'Demasiados intentos fallidos. Tu cuenta se bloqueó por 5 minutos.'
          : 'La contraseña ingresada es incorrecta.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      data: {
        user: {
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        ...tokens,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const tokens = await this.generateTokens(payload.sub, payload.email);

      return {
        data: tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        uuid: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
