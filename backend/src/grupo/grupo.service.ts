import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';

@Injectable()
export class GrupoService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number | undefined,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    datosAntes?: any,
    datosDespues?: any,
  ) {
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuarioId || undefined,
        accion,
        tablaAfectada,
        registroId,
        datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
        datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
        ip: '127.0.0.1',
        dispositivo: 'API',
      },
    });
  }

  async create(createGrupoDto: CreateGrupoDto) {
    return this.prisma.$transaction(async (prisma) => {
      const sede = await prisma.sede.findUnique({
        where: { id: createGrupoDto.sedeId },
      });
      if (!sede) {
        throw new BadRequestException('Sede no encontrada');
      }

      const grupo = await prisma.grupo.create({
        data: {
          tipoUsuario: createGrupoDto.tipoUsuario,
          nombreEmpresa: createGrupoDto.nombreEmpresa,
          descripcion: createGrupoDto.descripcion,
          sedeId: createGrupoDto.sedeId,
        },
        include: { sede: true },
      });

      await this.crearAuditoria(
        createGrupoDto.usuarioId,
        'CREAR',
        'Grupo',
        grupo.id,
        null,
        grupo,
      );

      return {
        success: true,
        message: 'Grupo creado correctamente',
        data: grupo,
      };
    });
  }

  async findAll(usuarioId: number, userRole: string) {
    const grupos = await this.prisma.grupo.findMany({
      include: {
        sede: {
          select: { id: true, nombre: true, direccion: true, telefono: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: grupos };
  }

  async findAllPublic() {
    const grupos = await this.prisma.grupo.findMany({
      include: { sede: true },
      orderBy: { tipoUsuario: 'asc' },
    });
    return { success: true, data: grupos };
  }

  async findOne(id: number) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
      include: { sede: true },
    });
    if (!grupo) throw new NotFoundException(`Grupo con ID ${id} no encontrado`);
    return { success: true, data: grupo };
  }

  async findOneByUuid(uuid: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { uuid },
      include: { sede: true },
    });
    if (!grupo)
      throw new NotFoundException(`Grupo con UUID ${uuid} no encontrado`);
    return { success: true, data: grupo };
  }

  async update(id: number, updateGrupoDto: UpdateGrupoDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existente = await prisma.grupo.findUnique({ where: { id } });
      if (!existente)
        throw new NotFoundException(`Grupo con ID ${id} no encontrado`);

      if (updateGrupoDto.sedeId) {
        const sede = await prisma.sede.findUnique({
          where: { id: updateGrupoDto.sedeId },
        });
        if (!sede) throw new BadRequestException('Sede no encontrada');
      }

      const actualizado = await prisma.grupo.update({
        where: { id },
        data: {
          tipoUsuario: updateGrupoDto.tipoUsuario,
          nombreEmpresa: updateGrupoDto.nombreEmpresa,
          descripcion: updateGrupoDto.descripcion,
          sedeId: updateGrupoDto.sedeId,
        },
        include: { sede: true },
      });

      await this.crearAuditoria(
        updateGrupoDto.usuarioId,
        'ACTUALIZAR',
        'Grupo',
        id,
        existente,
        actualizado,
      );
      return {
        success: true,
        message: 'Grupo actualizado correctamente',
        data: actualizado,
      };
    });
  }

  async remove(id: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const grupo = await prisma.grupo.findUnique({ where: { id } });
      if (!grupo)
        throw new NotFoundException(`Grupo con ID ${id} no encontrado`);

      await prisma.grupo.delete({ where: { id } });
      await this.crearAuditoria(
        usuarioId,
        'ELIMINAR',
        'Grupo',
        id,
        grupo,
        null,
      );
      return { success: true, message: 'Grupo eliminado correctamente' };
    });
  }
}
