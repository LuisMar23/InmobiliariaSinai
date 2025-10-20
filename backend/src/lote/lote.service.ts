import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateLoteDto, EstadoInmueble } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';

@Injectable()
export class LotesService {
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

  async create(createLoteDto: CreateLoteDto) {
    return this.prisma.$transaction(async (prisma) => {
      // Verificar que la urbanización existe
      const urbanizacion = await prisma.urbanizacion.findUnique({
        where: { id: createLoteDto.urbanizacionId },
      });

      if (!urbanizacion) {
        throw new BadRequestException('Urbanización no encontrada');
      }

      // Verificar si el número de lote ya existe en la urbanización
      const loteExistente = await prisma.lote.findFirst({
        where: {
          urbanizacionId: createLoteDto.urbanizacionId,
          numeroLote: createLoteDto.numeroLote,
        },
      });

      if (loteExistente) {
        throw new BadRequestException(
          'El número de lote ya existe en esta urbanización',
        );
      }

      const lote = await prisma.lote.create({
        data: {
          urbanizacionId: createLoteDto.urbanizacionId,
          numeroLote: createLoteDto.numeroLote,
          superficieM2: createLoteDto.superficieM2,
          precioBase: createLoteDto.precioBase,
          estado: createLoteDto.estado || EstadoInmueble.DISPONIBLE,
        },
        include: {
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        createLoteDto.usuarioId,
        'CREAR',
        'Lote',
        lote.id,
        null,
        lote,
      );

      return {
        success: true,
        message: 'Lote creado correctamente',
        data: lote,
      };
    });
  }

  async findAll(urbanizacionId?: number) {
    const where = urbanizacionId ? { urbanizacionId } : {};

    const lotes = await this.prisma.lote.findMany({
      where,
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
          },
        },
        _count: {
          select: {
            cotizaciones: true,
            ventas: true,
            reservas: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: lotes,
    };
  }

  async findOne(id: number) {
    const lote = await this.prisma.lote.findUnique({
      where: { id },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            descripcion: true,
          },
        },
        imagenes: {
          select: {
            id: true,
            urlImagen: true,
            descripcion: true,
          },
        },
        cotizaciones: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lote) {
      throw new NotFoundException(`Lote con ID ${id} no encontrado`);
    }

    return {
      success: true,
      data: lote,
    };
  }

  async update(id: number, updateLoteDto: UpdateLoteDto) {
    return this.prisma.$transaction(async (prisma) => {
      const loteExistente = await prisma.lote.findUnique({
        where: { id },
      });

      if (!loteExistente) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }

      const datosAntes = { ...loteExistente };

      // Verificar urbanización si se está actualizando
      if (updateLoteDto.urbanizacionId) {
        const urbanizacion = await prisma.urbanizacion.findUnique({
          where: { id: updateLoteDto.urbanizacionId },
        });
        if (!urbanizacion) {
          throw new BadRequestException('Urbanización no encontrada');
        }
      }

      // Verificar número de lote único si se está actualizando
      if (updateLoteDto.numeroLote) {
        const loteConMismoNumero = await prisma.lote.findFirst({
          where: {
            urbanizacionId:
              updateLoteDto.urbanizacionId || loteExistente.urbanizacionId,
            numeroLote: updateLoteDto.numeroLote,
            id: { not: id },
          },
        });
        if (loteConMismoNumero) {
          throw new BadRequestException(
            'El número de lote ya existe en esta urbanización',
          );
        }
      }

      const loteActualizado = await prisma.lote.update({
        where: { id },
        data: updateLoteDto,
        include: {
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        updateLoteDto.usuarioId,
        'ACTUALIZAR',
        'Lote',
        id,
        datosAntes,
        loteActualizado,
      );

      return {
        success: true,
        message: 'Lote actualizado correctamente',
        data: loteActualizado,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const lote = await prisma.lote.findUnique({
        where: { id },
        include: {
          cotizaciones: true,
          ventas: true,
          reservas: true,
        },
      });

      if (!lote) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }

      // Verificar si tiene relaciones
      if (
        lote.cotizaciones.length > 0 ||
        lote.ventas.length > 0 ||
        lote.reservas.length > 0
      ) {
        throw new BadRequestException(
          'No se puede eliminar el lote porque tiene relaciones activas',
        );
      }

      const datosAntes = { ...lote };

      await prisma.lote.delete({
        where: { id },
      });

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Lote',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Lote eliminado correctamente',
      };
    });
  }
}
