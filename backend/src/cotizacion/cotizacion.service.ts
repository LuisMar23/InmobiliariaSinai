import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateCotizacionDto,
  EstadoCotizacion,
  TipoInmueble,
} from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

@Injectable()
export class CotizacionesService {
  constructor(private prisma: PrismaService) {}

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offset = -4 * 60;
    const localTime = new Date(now.getTime() + offset * 60 * 1000);
    return localTime;
  }

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
          createdAt: this.getCurrentTimeLaPaz(),
        },
      });
    } catch (error) {
      console.error('Error creando auditoría:', error);
    }
  }

  async create(createCotizacionDto: CreateCotizacionDto, asesorId: number) {
    try {
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

        if (createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE) {
          const lote = await prisma.lote.findUnique({
            where: { id: createCotizacionDto.inmuebleId },
          });

          if (!lote) {
            throw new BadRequestException('Lote no encontrado');
          }

          if (lote.estado !== 'DISPONIBLE' && lote.estado !== 'CON_OFERTA') {
            throw new BadRequestException(
              'El lote no está disponible para cotización',
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
                createdAt: true,
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

        await this.crearAuditoria(
          asesorId,
          'CREAR_COTIZACION',
          'Cotizacion',
          cotizacion.id,
          null,
          {
            clienteId: cotizacion.clienteId,
            asesorId: cotizacion.asesorId,
            inmuebleTipo: cotizacion.inmuebleTipo,
            inmuebleId: cotizacion.inmuebleId,
            precioOfertado: cotizacion.precioOfertado,
            estado: cotizacion.estado,
          },
        );

        return {
          success: true,
          message: 'Cotización creada correctamente',
          data: cotizacion,
        };
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findAll(clienteId?: number, estado?: string) {
    try {
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
        },
        orderBy: { createdAt: 'desc' },
      });

      const cotizacionesConLotes = await Promise.all(
        cotizaciones.map(async (cotizacion) => {
          let loteInfo: any = null;

          if (cotizacion.inmuebleTipo === TipoInmueble.LOTE) {
            const lote = await this.prisma.lote.findUnique({
              where: { id: cotizacion.inmuebleId },
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

            if (lote) {
              loteInfo = {
                id: lote.id,
                numeroLote: lote.numeroLote,
                superficieM2: Number(lote.superficieM2),
                precioBase: Number(lote.precioBase),
                estado: lote.estado,
                urbanizacion: lote.urbanizacion,
              };
            }
          }

          return {
            ...cotizacion,
            lote: loteInfo,
          };
        }),
      );

      return { success: true, data: cotizacionesConLotes };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
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
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      let loteInfo: any = null;
      if (cotizacion.inmuebleTipo === TipoInmueble.LOTE) {
        const lote = await this.prisma.lote.findUnique({
          where: { id: cotizacion.inmuebleId },
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

        if (lote) {
          loteInfo = {
            id: lote.id,
            numeroLote: lote.numeroLote,
            superficieM2: Number(lote.superficieM2),
            precioBase: Number(lote.precioBase),
            estado: lote.estado,
            urbanizacion: lote.urbanizacion,
          };
        }
      }

      const cotizacionConLote = {
        ...cotizacion,
        lote: loteInfo,
      };

      return { success: true, data: cotizacionConLote };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async update(
    id: number,
    updateCotizacionDto: UpdateCotizacionDto,
    usuarioId: number,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const cotizacionExistente = await prisma.cotizacion.findUnique({
          where: { id },
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
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async remove(id: number, usuarioId: number) {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getCotizacionesPorCliente(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findFirst({
        where: { id: clienteId, isActive: true, role: 'CLIENTE' },
      });

      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const cotizaciones = await this.prisma.cotizacion.findMany({
        where: { clienteId: clienteId },
        include: {
          asesor: {
            select: {
              id: true,
              fullName: true,
              telefono: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const cotizacionesConLotes = await Promise.all(
        cotizaciones.map(async (cotizacion) => {
          let loteInfo: any = null;

          if (cotizacion.inmuebleTipo === TipoInmueble.LOTE) {
            const lote = await this.prisma.lote.findUnique({
              where: { id: cotizacion.inmuebleId },
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

            if (lote) {
              loteInfo = {
                id: lote.id,
                numeroLote: lote.numeroLote,
                superficieM2: Number(lote.superficieM2),
                precioBase: Number(lote.precioBase),
                estado: lote.estado,
                urbanizacion: lote.urbanizacion,
              };
            }
          }

          return {
            ...cotizacion,
            lote: loteInfo,
          };
        }),
      );

      return {
        success: true,
        data: { cliente, cotizaciones: cotizacionesConLotes },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
