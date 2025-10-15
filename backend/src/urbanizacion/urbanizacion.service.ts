import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUrbanizacionDto } from './dto/create-urbanizacion.dto';
import { UpdateUrbanizacionDto } from './dto/update-urbanizacion.dto';
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class UrbanizacionService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.urbanizacion.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.urbanizacion.count(),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const urbanizacion = await this.prisma.urbanizacion.findUnique({
      where: { id },
    });
    if (!urbanizacion) {
      throw new NotFoundException(`Urbanización con id ${id} no encontrada`);
    }
    return urbanizacion;
  }

   async create(dto: CreateUrbanizacionDto, usuarioId?: number, ip?: string, dispositivo?: string) {
    const nueva = await this.prisma.urbanizacion.create({
      data: {
        nombre: dto.nombre,
        ubicacion: dto.ubicacion,
        descripcion: dto.descripcion,
      },
    });

    // registrar en auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId,
        accion: 'CREATE',
        tablaAfectada: 'Urbanizacion',
        registroId: nueva.id,
        datosDespues: JSON.stringify(nueva),
        ip,
        dispositivo,
      },
    });

    return nueva;
  }

  async update(id: number, dto: UpdateUrbanizacionDto, usuarioId?: number, ip?: string, dispositivo?: string) {
    const anterior = await this.findOne(id);

    const actualizada = await this.prisma.urbanizacion.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        ubicacion: dto.ubicacion,
        descripcion: dto.descripcion,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId,
        accion: 'UPDATE',
        tablaAfectada: 'Urbanizacion',
        registroId: id,
        datosAntes: JSON.stringify(anterior),
        datosDespues: JSON.stringify(actualizada),
        ip,
        dispositivo,
      },
    });

    return actualizada;
  }
  async remove(id: number, usuarioId?: number, ip?: string, dispositivo?: string) {
    const anterior = await this.findOne(id);

    const eliminada = await this.prisma.urbanizacion.delete({
      where: { id },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId,
        accion: 'DELETE',
        tablaAfectada: 'Urbanizacion',
        registroId: id,
        datosAntes: JSON.stringify(anterior),
        ip,
        dispositivo,
      },
    });

    return eliminada;
  }
}
