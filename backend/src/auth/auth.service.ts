import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, UserRole } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/config/prisma.service';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offset = -4 * 60;
    const localTime = new Date(now.getTime() + offset * 60 * 1000);
    return localTime;
  }

  async register(registerDto: RegisterDto) {
    const { username, email, password, fullName, ci, telefono } = registerDto;
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedUsername = username.toLowerCase().trim();
      const normalizedCi = ci.trim();
      const normalizedTelefono = telefono.trim();
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
        if (existingUser.email === normalizedEmail)
          throw new ConflictException('El email ya está registrado');
        if (existingUser.username === normalizedUsername)
          throw new ConflictException('El nombre de usuario ya existe');
        if (existingUser.ci === normalizedCi)
          throw new ConflictException('El CI ya está registrado');
        if (existingUser.telefono === normalizedTelefono)
          throw new ConflictException('El teléfono ya está registrado');
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
          role: UserRole.USUARIO,
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
      const userEmail = user.email ? user.email : normalizedEmail;
      const tokens = await this.generateTokens(user.id, userEmail);
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
        data: { user, ...tokens },
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
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
            { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
            { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
          ],
          isActive: true,
          role: { not: UserRole.CLIENTE },
        },
      });
      if (!user) throw new UnauthorizedException('Credenciales inválidas');
      if (!user.passwordHash)
        throw new UnauthorizedException(
          'Este usuario no tiene credenciales de acceso',
        );
      const now = this.getCurrentTimeLaPaz();
      if (user.lockUntil && user.lockUntil > now) {
        const diffMs = user.lockUntil.getTime() - now.getTime();
        const diffMin = Math.ceil(diffMs / (1000 * 60));
        throw new UnauthorizedException(
          `Cuenta bloqueada. Intenta nuevamente en ${diffMin} minutos.`,
        );
      }
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        const failedAttempts = (user.failedAttempts || 0) + 1;
        const lockUntil =
          failedAttempts >= 5 ? new Date(now.getTime() + 5 * 60 * 1000) : null;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts, lockUntil },
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
          data: { failedAttempts: 0, lockUntil: null, lastLogin: now },
        });
      }
      let tokens;
      if (user.email) {
        tokens = await this.generateTokens(user.id, user.email);
      } else {
        tokens = await this.generateTokens(
          user.id,
          `user${user.id}@inmobiliaria.com`,
        );
      }
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
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { identifier, newPassword, confirmPassword } = changePasswordDto;
    if (newPassword !== confirmPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un símbolo.',
      );
    }
    try {
      const normalizedIdentifier = identifier.toLowerCase().trim();
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
            { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
          ],
          isActive: true,
          role: { not: UserRole.CLIENTE },
        },
      });
      if (!user) {
        throw new NotFoundException(
          'No se encontró ningún usuario con ese username o email',
        );
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          failedAttempts: 0,
          lockUntil: null,
          updatedAt: new Date(),
        },
      });
      await this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          accion: 'CAMBIO_CONTRASEÑA',
          tablaAfectada: 'User',
          registroId: user.id,
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
      return {
        success: true,
        message: 'Contraseña cambiada exitosamente',
        data: {
          user: { username: user.username, email: user.email, role: user.role },
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getAllUsers() {
    try {
      const users = await this.prisma.user.findMany({
        where: { isActive: true, role: { not: UserRole.CLIENTE } },
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: { users } };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getUserById(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      return { success: true, data: { user } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const updateData: any = {};
      if (updateUserDto.fullName !== undefined)
        updateData.fullName = updateUserDto.fullName;
      if (updateUserDto.username !== undefined)
        updateData.username = updateUserDto.username;
      if (updateUserDto.email !== undefined)
        updateData.email = updateUserDto.email;
      if (updateUserDto.telefono !== undefined)
        updateData.telefono = updateUserDto.telefono;
      if (updateUserDto.direccion !== undefined)
        updateData.direccion = updateUserDto.direccion;
      if (updateUserDto.observaciones !== undefined)
        updateData.observaciones = updateUserDto.observaciones;
      if (updateUserDto.role !== undefined)
        updateData.role = updateUserDto.role;
      if (updateUserDto.isActive !== undefined)
        updateData.isActive = updateUserDto.isActive;
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await this.prisma.auditoria.create({
        data: {
          usuarioId: userId,
          accion: 'ACTUALIZAR_USUARIO',
          tablaAfectada: 'User',
          registroId: userId,
          datosAntes: JSON.stringify(user),
          datosDespues: JSON.stringify(updatedUser),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
      return {
        success: true,
        message: 'Usuario actualizado correctamente',
        data: { user: updatedUser },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async deleteUser(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      await this.prisma.auditoria.create({
        data: {
          usuarioId: userId,
          accion: 'ELIMINAR_USUARIO',
          tablaAfectada: 'User',
          registroId: userId,
          datosAntes: JSON.stringify(user),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
      return { success: true, message: 'Usuario eliminado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async createCliente(createClienteDto: CreateClienteDto) {
    const { fullName, ci, telefono, direccion, observaciones } =
      createClienteDto;
    try {
      const normalizedCi = ci.trim();
      const normalizedTelefono = telefono.trim();
      const existingCliente = await this.prisma.user.findFirst({
        where: {
          OR: [{ ci: normalizedCi }, { telefono: normalizedTelefono }],
          role: UserRole.CLIENTE,
          isActive: true,
        },
      });
      if (existingCliente) {
        if (existingCliente.ci === normalizedCi)
          throw new ConflictException('Ya existe un cliente con este CI');
        if (existingCliente.telefono === normalizedTelefono)
          throw new ConflictException('Ya existe un cliente con este teléfono');
      }
      const cliente = await this.prisma.user.create({
        data: {
          fullName: fullName.trim(),
          ci: normalizedCi,
          telefono: normalizedTelefono,
          direccion: direccion?.trim(),
          observaciones: observaciones?.trim(),
          role: UserRole.CLIENTE,
          isActive: true,
          passwordHash: null,
          username: null,
          email: null,
        },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
        },
      });
      await this.prisma.auditoria.create({
        data: {
          usuarioId: cliente.id,
          accion: 'REGISTRO_CLIENTE',
          tablaAfectada: 'User',
          registroId: cliente.id,
          datosDespues: JSON.stringify({
            fullName: cliente.fullName,
            ci: cliente.ci,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            observaciones: cliente.observaciones,
            role: cliente.role,
          }),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
      return {
        success: true,
        message: 'Cliente registrado correctamente',
        data: { cliente },
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getClientes() {
    try {
      const clientes = await this.prisma.user.findMany({
        where: { isActive: true, role: UserRole.CLIENTE },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: { clientes } };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getClienteById(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id: clienteId, role: UserRole.CLIENTE, isActive: true },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!cliente) throw new NotFoundException('Cliente no encontrado');
      return { success: true, data: { user: cliente } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async updateCliente(clienteId: number, updateClienteDto: UpdateClienteDto) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id: clienteId, role: UserRole.CLIENTE, isActive: true },
      });
      if (!cliente) throw new NotFoundException('Cliente no encontrado');
      const normalizedCi = updateClienteDto.ci
        ? updateClienteDto.ci.trim()
        : cliente.ci;
      const normalizedTelefono = updateClienteDto.telefono.trim();
      const existingCliente = await this.prisma.user.findFirst({
        where: {
          id: { not: clienteId },
          OR: [{ ci: normalizedCi }, { telefono: normalizedTelefono }],
          role: UserRole.CLIENTE,
          isActive: true,
        },
      });
      if (existingCliente) {
        if (existingCliente.ci === normalizedCi)
          throw new ConflictException('Ya existe un cliente con este CI');
        if (existingCliente.telefono === normalizedTelefono)
          throw new ConflictException('Ya existe un cliente con este teléfono');
      }
      const updatedCliente = await this.prisma.user.update({
        where: { id: clienteId },
        data: {
          fullName: updateClienteDto.fullName.trim(),
          ci: normalizedCi,
          telefono: normalizedTelefono,
          direccion: updateClienteDto.direccion?.trim(),
          observaciones: updateClienteDto.observaciones?.trim(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await this.prisma.auditoria.create({
        data: {
          usuarioId: clienteId,
          accion: 'ACTUALIZAR_CLIENTE',
          tablaAfectada: 'User',
          registroId: clienteId,
          datosAntes: JSON.stringify(cliente),
          datosDespues: JSON.stringify(updatedCliente),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
      return {
        success: true,
        message: 'Cliente actualizado correctamente',
        data: { cliente: updatedCliente },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async deleteCliente(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id: clienteId, role: UserRole.CLIENTE, isActive: true },
      });
      if (!cliente) throw new NotFoundException('Cliente no encontrado');
      await this.prisma.user.update({
        where: { id: clienteId },
        data: { isActive: false },
      });
      await this.prisma.auditoria.create({
        data: {
          usuarioId: clienteId,
          accion: 'ELIMINAR_CLIENTE',
          tablaAfectada: 'User',
          registroId: clienteId,
          datosAntes: JSON.stringify(cliente),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
      return { success: true, message: 'Cliente eliminado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
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
          role: { not: UserRole.CLIENTE },
        },
      });
      if (!user) throw new UnauthorizedException('Usuario no encontrado');
      let tokens;
      if (payload.email) {
        tokens = await this.generateTokens(payload.sub, payload.email);
      } else {
        tokens = await this.generateTokens(
          payload.sub,
          `user${payload.sub}@inmobiliaria.com`,
        );
      }
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
      where: { id: userId, isActive: true, role: { not: UserRole.CLIENTE } },
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
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email: email.toLowerCase() };
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
    return { accessToken, refreshToken };
  }
}
