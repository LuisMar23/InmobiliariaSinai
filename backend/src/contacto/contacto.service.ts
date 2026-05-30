import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Injectable()
export class ContactoService {
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

  async create(createContactoDto: CreateContactoDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existente = await prisma.contacto.findFirst({
        where: { ci: createContactoDto.ci },
      });
      if (existente) {
        throw new BadRequestException('Ya existe un contacto con ese CI');
      }

      if (createContactoDto.email) {
        const emailExistente = await prisma.contacto.findFirst({
          where: { email: createContactoDto.email },
        });
        if (emailExistente) {
          throw new BadRequestException(
            'Ya existe un contacto con ese correo electrónico',
          );
        }
      }

      const contacto = await prisma.contacto.create({
        data: {
          firstName: createContactoDto.firstName,
          lastName: createContactoDto.lastName,
          ci: createContactoDto.ci,
          genero: createContactoDto.genero,
          telefono: createContactoDto.telefono,
          ocupacion: createContactoDto.ocupacion,
          email: createContactoDto.email,
          pais: createContactoDto.pais,
          departamento: createContactoDto.departamento,
          domicilio: createContactoDto.domicilio,
        },
      });

      await this.crearAuditoria(
        createContactoDto.usuarioId,
        'CREAR',
        'Contacto',
        contacto.id,
        null,
        contacto,
      );

      return {
        success: true,
        message: 'Contacto creado correctamente',
        data: contacto,
      };
    });
  }

  async findAll(usuarioId: number, userRole: string) {
    const contactos = await this.prisma.contacto.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: contactos };
  }

  async findAllPublic() {
    const contactos = await this.prisma.contacto.findMany({
      orderBy: { firstName: 'asc' },
    });
    return { success: true, data: contactos };
  }

  async findOne(id: number) {
    const contacto = await this.prisma.contacto.findUnique({
      where: { id },
    });
    if (!contacto)
      throw new NotFoundException(`Contacto con ID ${id} no encontrado`);
    return { success: true, data: contacto };
  }

  async findOneByUuid(uuid: string) {
    const contacto = await this.prisma.contacto.findUnique({
      where: { uuid },
    });
    if (!contacto)
      throw new NotFoundException(`Contacto con UUID ${uuid} no encontrado`);
    return { success: true, data: contacto };
  }

  async update(id: number, updateContactoDto: UpdateContactoDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existente = await prisma.contacto.findUnique({ where: { id } });
      if (!existente)
        throw new NotFoundException(`Contacto con ID ${id} no encontrado`);

      if (updateContactoDto.ci && updateContactoDto.ci !== existente.ci) {
        const ciExistente = await prisma.contacto.findFirst({
          where: { ci: updateContactoDto.ci, id: { not: id } },
        });
        if (ciExistente)
          throw new BadRequestException('Ya existe otro contacto con ese CI');
      }

      if (
        updateContactoDto.email &&
        updateContactoDto.email !== existente.email
      ) {
        const emailExistente = await prisma.contacto.findFirst({
          where: { email: updateContactoDto.email, id: { not: id } },
        });
        if (emailExistente)
          throw new BadRequestException(
            'Ya existe otro contacto con ese correo electrónico',
          );
      }

      const actualizado = await prisma.contacto.update({
        where: { id },
        data: {
          firstName: updateContactoDto.firstName,
          lastName: updateContactoDto.lastName,
          ci: updateContactoDto.ci,
          genero: updateContactoDto.genero,
          telefono: updateContactoDto.telefono,
          ocupacion: updateContactoDto.ocupacion,
          email: updateContactoDto.email,
          pais: updateContactoDto.pais,
          departamento: updateContactoDto.departamento,
          domicilio: updateContactoDto.domicilio,
        },
      });

      await this.crearAuditoria(
        updateContactoDto.usuarioId,
        'ACTUALIZAR',
        'Contacto',
        id,
        existente,
        actualizado,
      );
      return {
        success: true,
        message: 'Contacto actualizado correctamente',
        data: actualizado,
      };
    });
  }

  async remove(id: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const contacto = await prisma.contacto.findUnique({ where: { id } });
      if (!contacto)
        throw new NotFoundException(`Contacto con ID ${id} no encontrado`);

      await prisma.contacto.delete({ where: { id } });
      await this.crearAuditoria(
        usuarioId,
        'ELIMINAR',
        'Contacto',
        id,
        contacto,
        null,
      );
      return { success: true, message: 'Contacto eliminado correctamente' };
    });
  }
}
