import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateCotizacionDto,
  EstadoCotizacion,
  TipoInmueble,
  UserRole,
} from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

@Injectable()
export class CotizacionesService {
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

  async create(createCotizacionDto: CreateCotizacionDto) {
    return this.prisma.$transaction(async (prisma) => {
      // Verificar que cliente existe y tiene rol CLIENTE
      const cliente = await prisma.user.findFirst({
        where: {
          id: createCotizacionDto.clienteId,
          isActive: true,
          role: UserRole.CLIENTE,
        },
      });

      if (!cliente) {
        throw new BadRequestException(
          'Cliente no encontrado o no tiene rol de CLIENTE',
        );
      }

      // Verificar que asesor existe y tiene rol ASESOR
      const asesor = await prisma.user.findFirst({
        where: {
          id: createCotizacionDto.asesorId,
          isActive: true,
          role: UserRole.ASESOR,
        },
      });

      if (!asesor) {
        throw new BadRequestException(
          'Asesor no encontrado o no tiene rol de ASESOR',
        );
      }

      // Verificar que el inmueble existe y está disponible (solo para LOTES)
      let inmueble;
      if (createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE) {
        inmueble = await prisma.lote.findUnique({
          where: { id: createCotizacionDto.inmuebleId },
        });

        if (!inmueble) {
          throw new BadRequestException('Lote no encontrado');
        }

        if (
          inmueble.estado !== 'DISPONIBLE' &&
          inmueble.estado !== 'CON_OFERTA'
        ) {
          throw new BadRequestException(
            'El lote no está disponible para cotización',
          );
        }
      }

      // Crear la cotización
      const cotizacion = await prisma.cotizacion.create({
        data: {
          clienteId: createCotizacionDto.clienteId,
          asesorId: createCotizacionDto.asesorId,
          inmuebleTipo: createCotizacionDto.inmuebleTipo,
          inmuebleId: createCotizacionDto.inmuebleId,
          precioOfertado: createCotizacionDto.precioOfertado,
          estado: createCotizacionDto.estado || EstadoCotizacion.PENDIENTE,
        },
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              email: true,
              telefono: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          lote:
            createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE
              ? {
                  include: {
                    urbanizacion: {
                      select: {
                        id: true,
                        nombre: true,
                        ubicacion: true,
                      },
                    },
                  },
                }
              : false,
        },
      });

      // Actualizar estado del lote si es la primera cotización
      if (
        createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE &&
        inmueble?.estado === 'DISPONIBLE'
      ) {
        await prisma.lote.update({
          where: { id: createCotizacionDto.inmuebleId },
          data: { estado: 'CON_OFERTA' },
        });
      }

      // Auditoría
      await this.crearAuditoria(
        createCotizacionDto.usuarioId,
        'CREAR',
        'Cotizacion',
        cotizacion.id,
        null,
        cotizacion,
      );

      return {
        success: true,
        message: 'Cotización creada correctamente',
        data: cotizacion,
      };
    });
  }

  async findAll(clienteId?: number, estado?: string) {
    const where: any = {};
    if (clienteId) where.clienteId = clienteId;
    if (estado) where.estado = estado;

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        asesor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        lote: {
          include: {
            urbanizacion: {
              select: {
                id: true,
                nombre: true,
                ubicacion: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: cotizaciones,
    };
  }

  async findOne(id: number) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            fullName: true,
            email: true,
            telefono: true,
            ci: true,
            role: true,
          },
        },
        asesor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        lote: {
          include: {
            urbanizacion: {
              select: {
                id: true,
                nombre: true,
                ubicacion: true,
                descripcion: true,
              },
            },
          },
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return {
      success: true,
      data: cotizacion,
    };
  }

  async update(id: number, updateCotizacionDto: UpdateCotizacionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const cotizacionExistente = await prisma.cotizacion.findUnique({
        where: { id },
      });

      if (!cotizacionExistente) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      const datosAntes = { ...cotizacionExistente };

      // Verificar relaciones si se están actualizando
      if (updateCotizacionDto.clienteId) {
        const cliente = await prisma.user.findFirst({
          where: {
            id: updateCotizacionDto.clienteId,
            isActive: true,
            role: UserRole.CLIENTE,
          },
        });
        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }
      }

      if (updateCotizacionDto.asesorId) {
        const asesor = await prisma.user.findFirst({
          where: {
            id: updateCotizacionDto.asesorId,
            isActive: true,
            role: UserRole.ASESOR,
          },
        });
        if (!asesor) {
          throw new BadRequestException(
            'Asesor no encontrado o no tiene rol de ASESOR',
          );
        }
      }

      const cotizacionActualizada = await prisma.cotizacion.update({
        where: { id },
        data: updateCotizacionDto,
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          lote: {
            include: {
              urbanizacion: {
                select: {
                  id: true,
                  nombre: true,
                  ubicacion: true,
                },
              },
            },
          },
        },
      });

      await this.crearAuditoria(
        updateCotizacionDto.usuarioId,
        'ACTUALIZAR',
        'Cotizacion',
        id,
        datosAntes,
        cotizacionActualizada,
      );

      return {
        success: true,
        message: 'Cotización actualizada correctamente',
        data: cotizacionActualizada,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      const datosAntes = { ...cotizacion };

      await prisma.cotizacion.delete({
        where: { id },
      });

      // Verificar si era la única cotización del lote para restaurar estado
      if (cotizacion.inmuebleTipo === TipoInmueble.LOTE) {
        const otrasCotizaciones = await prisma.cotizacion.count({
          where: {
            inmuebleId: cotizacion.inmuebleId,
            inmuebleTipo: TipoInmueble.LOTE,
            id: { not: id },
          },
        });

        if (otrasCotizaciones === 0) {
          await prisma.lote.update({
            where: { id: cotizacion.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }
      }

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Cotizacion',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Cotización eliminada correctamente',
      };
    });
  }
}
