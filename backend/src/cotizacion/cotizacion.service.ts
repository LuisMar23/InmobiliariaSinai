// src/cotizacion/cotizacion.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateCotizacionDto,
  EstadoCotizacion,
  TipoInmueble,
} from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

@Injectable()
export class CotizacionService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    datosAntes?: any,
    datosDespues?: any,
  ) {
    try {
      await this.prisma.auditoria.create({
        data: {
          usuarioId: usuarioId,
          accion,
          tablaAfectada,
          registroId,
          datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
          datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
    } catch (error) {
      console.error('Error creando auditoría:', error);
    }
  }

  async create(createCotizacionDto: CreateCotizacionDto, asesorId: number) {
    return await this.prisma.$transaction(async (prisma) => {
      const asesor = await prisma.user.findFirst({
        where: { id: asesorId, isActive: true, role: 'ASESOR' },
      });

      if (!asesor) {
        throw new ForbiddenException(
          'No tienes permisos para crear cotizaciones. Se requiere rol de ASESOR',
        );
      }

      const cliente = await prisma.user.findFirst({
        where: {
          id: createCotizacionDto.clienteId,
          isActive: true,
          role: 'CLIENTE',
        },
      });

      if (!cliente) {
        throw new BadRequestException(
          'Cliente no encontrado o no tiene rol de CLIENTE',
        );
      }

      let loteInfo: any = null;
      let precioReferencia: number = 0;

      if (createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE) {
        const lote = await prisma.lote.findUnique({
          where: { id: createCotizacionDto.inmuebleId },
          include: {
            LotePromocion: {
              where: {
                promocion: {
                  isActive: true,
                  fechaInicio: { lte: new Date() },
                  fechaFin: { gte: new Date() },
                },
              },
              include: {
                promocion: {
                  select: {
                    id: true,
                    titulo: true,
                    descuento: true,
                  },
                },
              },
            },
          },
        });

        if (!lote) {
          throw new BadRequestException('Lote no encontrado');
        }

        if (lote.estado !== 'DISPONIBLE' && lote.estado !== 'CON_OFERTA') {
          throw new BadRequestException(
            'El lote no está disponible para cotización',
          );
        }

        const promocionActiva = lote.LotePromocion[0];
        precioReferencia = promocionActiva
          ? Number(promocionActiva.precioConDescuento)
          : Number(lote.precioBase);

        loteInfo = {
          id: lote.id,
          numeroLote: lote.numeroLote,
          precioBase: lote.precioBase,
          precioConPromocion: promocionActiva
            ? promocionActiva.precioConDescuento
            : null,
          tienePromocion: !!promocionActiva,
          promocion: promocionActiva
            ? {
                id: promocionActiva.promocion.id,
                titulo: promocionActiva.promocion.titulo,
                descuento: promocionActiva.promocion.descuento,
              }
            : null,
        };

        if (createCotizacionDto.precioOfertado > precioReferencia) {
          throw new BadRequestException(
            `El precio ofertado no puede ser mayor al precio actual del lote (${precioReferencia})`,
          );
        }
      }

      const cotizacion = await prisma.cotizacion.create({
        data: {
          clienteId: createCotizacionDto.clienteId,
          asesorId: asesorId,
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
              ci: true,
              telefono: true,
              direccion: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      if (createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE) {
        await prisma.lote.update({
          where: { id: createCotizacionDto.inmuebleId },
          data: { estado: 'CON_OFERTA' },
        });
      }

      const datosAuditoria = {
        ...cotizacion,
        loteInfo,
        precioReferencia,
      };

      await this.crearAuditoria(
        asesorId,
        'CREAR_COTIZACION',
        'Cotizacion',
        cotizacion.id,
        null,
        datosAuditoria,
      );

      return {
        success: true,
        message: 'Cotización creada correctamente',
        data: {
          ...cotizacion,
          loteInfo,
          precioReferencia,
        },
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
            ci: true,
            telefono: true,
            direccion: true,
            role: true,
          },
        },
        asesor: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        lote: {
          include: {
            urbanizacion: {
              select: {
                id: true,
                nombre: true,
              },
            },
            LotePromocion: {
              where: {
                promocion: {
                  isActive: true,
                  fechaInicio: { lte: new Date() },
                  fechaFin: { gte: new Date() },
                },
              },
              include: {
                promocion: {
                  select: {
                    id: true,
                    titulo: true,
                    descuento: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cotizacionesEnriquecidas = cotizaciones.map((cotizacion) => {
      let precioReferencia = 0;
      let tienePromocion = false;
      let promocionInfo: any = null;

      if (cotizacion.lote) {
        const promocionActiva = cotizacion.lote.LotePromocion[0];
        precioReferencia = promocionActiva
          ? Number(promocionActiva.precioConDescuento)
          : Number(cotizacion.lote.precioBase);
        tienePromocion = !!promocionActiva;
        promocionInfo = promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
            }
          : null;
      }

      return {
        ...cotizacion,
        precioReferencia,
        tienePromocion,
        promocionInfo,
        diferenciaPrecio: precioReferencia - Number(cotizacion.precioOfertado),
        porcentajeDescuento:
          precioReferencia > 0
            ? ((precioReferencia - Number(cotizacion.precioOfertado)) /
                precioReferencia) *
              100
            : 0,
      };
    });

    return { success: true, data: cotizacionesEnriquecidas };
  }

  async findOne(id: number) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            fullName: true,
            ci: true,
            telefono: true,
            direccion: true,
            observaciones: true,
            role: true,
          },
        },
        asesor: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            telefono: true,
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
            LotePromocion: {
              where: {
                promocion: {
                  isActive: true,
                  fechaInicio: { lte: new Date() },
                  fechaFin: { gte: new Date() },
                },
              },
              include: {
                promocion: {
                  select: {
                    id: true,
                    titulo: true,
                    descuento: true,
                    fechaInicio: true,
                    fechaFin: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    let precioReferencia = 0;
    let tienePromocion = false;
    let promocionInfo: any = null;

    if (cotizacion.lote) {
      const promocionActiva = cotizacion.lote.LotePromocion[0];
      precioReferencia = promocionActiva
        ? Number(promocionActiva.precioConDescuento)
        : Number(cotizacion.lote.precioBase);
      tienePromocion = !!promocionActiva;
      promocionInfo = promocionActiva
        ? {
            id: promocionActiva.promocion.id,
            titulo: promocionActiva.promocion.titulo,
            descuento: promocionActiva.promocion.descuento,
            fechaInicio: promocionActiva.promocion.fechaInicio,
            fechaFin: promocionActiva.promocion.fechaFin,
          }
        : null;
    }

    const cotizacionEnriquecida = {
      ...cotizacion,
      precioReferencia,
      tienePromocion,
      promocionInfo,
      diferenciaPrecio: precioReferencia - Number(cotizacion.precioOfertado),
      porcentajeDescuento:
        precioReferencia > 0
          ? ((precioReferencia - Number(cotizacion.precioOfertado)) /
              precioReferencia) *
            100
          : 0,
    };

    return { success: true, data: cotizacionEnriquecida };
  }

  async update(
    id: number,
    updateCotizacionDto: UpdateCotizacionDto,
    usuarioId: number,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      const cotizacionExistente = await prisma.cotizacion.findUnique({
        where: { id },
        include: {
          lote: {
            include: {
              LotePromocion: {
                where: {
                  promocion: {
                    isActive: true,
                    fechaInicio: { lte: new Date() },
                    fechaFin: { gte: new Date() },
                  },
                },
                include: {
                  promocion: {
                    select: {
                      id: true,
                      titulo: true,
                      descuento: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!cotizacionExistente) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      const datosAntes = { ...cotizacionExistente };

      if (updateCotizacionDto.clienteId) {
        const cliente = await prisma.user.findFirst({
          where: {
            id: updateCotizacionDto.clienteId,
            isActive: true,
            role: 'CLIENTE',
          },
        });
        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }
      }

      if (
        updateCotizacionDto.precioOfertado !== undefined &&
        cotizacionExistente.inmuebleTipo === TipoInmueble.LOTE &&
        cotizacionExistente.lote
      ) {
        const promocionActiva = cotizacionExistente.lote.LotePromocion[0];
        const precioReferencia = promocionActiva
          ? Number(promocionActiva.precioConDescuento)
          : Number(cotizacionExistente.lote.precioBase);

        if (updateCotizacionDto.precioOfertado > precioReferencia) {
          throw new BadRequestException(
            `El precio ofertado no puede ser mayor al precio actual del lote (${precioReferencia})`,
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
              ci: true,
              telefono: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        usuarioId,
        'ACTUALIZAR_COTIZACION',
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

  async remove(id: number, usuarioId: number) {
    return await this.prisma.$transaction(async (prisma) => {
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      const datosAntes = { ...cotizacion };

      await prisma.cotizacion.delete({ where: { id } });

      if (cotizacion.inmuebleTipo === TipoInmueble.LOTE) {
        const otrasCotizaciones = await prisma.cotizacion.count({
          where: {
            inmuebleId: cotizacion.inmuebleId,
            inmuebleTipo: TipoInmueble.LOTE,
            id: { not: id },
            estado: 'PENDIENTE',
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
        usuarioId,
        'ELIMINAR_COTIZACION',
        'Cotizacion',
        id,
        datosAntes,
        null,
      );

      return { success: true, message: 'Cotización eliminada correctamente' };
    });
  }
}
