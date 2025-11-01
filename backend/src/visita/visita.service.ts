import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateVisitaDto,
  EstadoVisita,
  TipoInmueble,
  UpdateVisitaDto,
} from './dto/create-visita.dto';

@Injectable()
export class VisitasService {
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

  private async getLoteInfo(inmuebleId: number) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: inmuebleId },
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

    if (!lote) return null;

    return {
      id: lote.id,
      numeroLote: lote.numeroLote,
      superficieM2: Number(lote.superficieM2),
      precioBase: Number(lote.precioBase),
      estado: lote.estado,
      urbanizacion: lote.urbanizacion,
    };
  }

  private async validateInmueble(
    inmuebleTipo: TipoInmueble,
    inmuebleId: number,
  ) {
    if (inmuebleTipo === TipoInmueble.LOTE) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: inmuebleId },
      });

      if (!lote) {
        throw new BadRequestException('Lote no encontrado');
      }
    }
    // Aquí puedes agregar validaciones para URBANIZACION si es necesario
  }

  async create(createVisitaDto: CreateVisitaDto, asesorId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Validar asesor
        const asesor = await prisma.user.findFirst({
          where: { id: asesorId, isActive: true, role: 'ASESOR' },
        });

        if (!asesor) {
          throw new ForbiddenException(
            'No tienes permisos para crear visitas. Se requiere rol de ASESOR',
          );
        }

        // Validar cliente
        const cliente = await prisma.user.findFirst({
          where: {
            id: createVisitaDto.clienteId,
            isActive: true,
            role: 'CLIENTE',
          },
        });

        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }

        // Validar inmueble
        await this.validateInmueble(
          createVisitaDto.inmuebleTipo,
          createVisitaDto.inmuebleId,
        );

        // Validar fecha (no puede ser en el pasado)
        const fechaVisita = new Date(createVisitaDto.fechaVisita);
        const ahora = this.getCurrentTimeLaPaz();

        if (fechaVisita < ahora) {
          throw new BadRequestException(
            'La fecha de visita no puede ser en el pasado',
          );
        }

        // Crear visita
        const visita = await prisma.visita.create({
          data: {
            clienteId: createVisitaDto.clienteId,
            asesorId: asesorId,
            inmuebleTipo: createVisitaDto.inmuebleTipo,
            inmuebleId: createVisitaDto.inmuebleId,
            fechaVisita: fechaVisita,
            estado: createVisitaDto.estado || EstadoVisita.PENDIENTE,
            comentarios: createVisitaDto.comentarios || null,
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

        // Auditoría
        await this.crearAuditoria(
          asesorId,
          'CREAR_VISITA',
          'Visita',
          visita.id,
          null,
          {
            clienteId: visita.clienteId,
            asesorId: visita.asesorId,
            inmuebleTipo: visita.inmuebleTipo,
            inmuebleId: visita.inmuebleId,
            fechaVisita: visita.fechaVisita,
            estado: visita.estado,
            comentarios: visita.comentarios,
          },
        );

        return {
          success: true,
          message: 'Visita creada correctamente',
          data: visita,
        };
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error en create visita:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findAll(clienteId?: number, estado?: string) {
    try {
      const where: any = {};

      if (clienteId) where.clienteId = clienteId;
      if (estado) where.estado = estado;

      const visitas = await this.prisma.visita.findMany({
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
        orderBy: { fechaVisita: 'desc' },
      });

      // Enriquecer con información del lote
      const visitasConLotes = await Promise.all(
        visitas.map(async (visita) => {
          let loteInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE) {
            loteInfo = await this.getLoteInfo(visita.inmuebleId);
          }

          return {
            ...visita,
            lote: loteInfo,
          };
        }),
      );

      return { success: true, data: visitasConLotes };
    } catch (error) {
      console.error('Error en findAll visitas:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
      const visita = await this.prisma.visita.findUnique({
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

      if (!visita) {
        throw new NotFoundException(`Visita con ID ${id} no encontrada`);
      }

      let loteInfo: any = null;
      if (visita.inmuebleTipo === TipoInmueble.LOTE) {
        loteInfo = await this.getLoteInfo(visita.inmuebleId);
      }

      const visitaConLote = {
        ...visita,
        lote: loteInfo,
      };

      return { success: true, data: visitaConLote };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error en findOne visita:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async update(
    id: number,
    updateVisitaDto: UpdateVisitaDto,
    usuarioId: number,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const visitaExistente = await prisma.visita.findUnique({
          where: { id },
        });

        if (!visitaExistente) {
          throw new NotFoundException(`Visita con ID ${id} no encontrada`);
        }

        const datosAntes = { ...visitaExistente };

        // Validar cliente si se está actualizando
        if (updateVisitaDto.clienteId) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateVisitaDto.clienteId,
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

        // Validar inmueble si se está actualizando
        if (updateVisitaDto.inmuebleTipo && updateVisitaDto.inmuebleId) {
          await this.validateInmueble(
            updateVisitaDto.inmuebleTipo,
            updateVisitaDto.inmuebleId,
          );
        }

        // Validar fecha si se está actualizando
        if (updateVisitaDto.fechaVisita) {
          const fechaVisita = new Date(updateVisitaDto.fechaVisita);
          const ahora = this.getCurrentTimeLaPaz();

          if (fechaVisita < ahora) {
            throw new BadRequestException(
              'La fecha de visita no puede ser en el pasado',
            );
          }
        }

        const visitaActualizada = await prisma.visita.update({
          where: { id },
          data: updateVisitaDto,
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
          'ACTUALIZAR_VISITA',
          'Visita',
          id,
          datosAntes,
          visitaActualizada,
        );

        return {
          success: true,
          message: 'Visita actualizada correctamente',
          data: visitaActualizada,
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error en update visita:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async remove(id: number, usuarioId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const visita = await prisma.visita.findUnique({
          where: { id },
        });

        if (!visita) {
          throw new NotFoundException(`Visita con ID ${id} no encontrada`);
        }

        const datosAntes = { ...visita };

        await prisma.visita.delete({ where: { id } });

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_VISITA',
          'Visita',
          id,
          datosAntes,
          null,
        );

        return { success: true, message: 'Visita eliminada correctamente' };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error en remove visita:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getVisitasPorCliente(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findFirst({
        where: { id: clienteId, isActive: true, role: 'CLIENTE' },
      });

      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const visitas = await this.prisma.visita.findMany({
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
        orderBy: { fechaVisita: 'desc' },
      });

      const visitasConLotes = await Promise.all(
        visitas.map(async (visita) => {
          let loteInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE) {
            loteInfo = await this.getLoteInfo(visita.inmuebleId);
          }

          return {
            ...visita,
            lote: loteInfo,
          };
        }),
      );

      return {
        success: true,
        data: { cliente, visitas: visitasConLotes },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error en getVisitasPorCliente:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getVisitasPorAsesor(asesorId: number) {
    try {
      const asesor = await this.prisma.user.findFirst({
        where: { id: asesorId, isActive: true, role: 'ASESOR' },
      });

      if (!asesor) {
        throw new NotFoundException('Asesor no encontrado');
      }

      const visitas = await this.prisma.visita.findMany({
        where: { asesorId: asesorId },
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
        },
        orderBy: { fechaVisita: 'desc' },
      });

      const visitasConLotes = await Promise.all(
        visitas.map(async (visita) => {
          let loteInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE) {
            loteInfo = await this.getLoteInfo(visita.inmuebleId);
          }

          return {
            ...visita,
            lote: loteInfo,
          };
        }),
      );

      return {
        success: true,
        data: { asesor, visitas: visitasConLotes },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error en getVisitasPorAsesor:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
