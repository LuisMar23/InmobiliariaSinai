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

  private async getPropiedadInfo(inmuebleId: number) {
    const propiedad = await this.prisma.propiedad.findUnique({
      where: { id: inmuebleId },
      select: {
        id: true,
        uuid: true,
        tipo: true,
        nombre: true,
        tamano: true,
        ubicacion: true,
        ciudad: true,
        descripcion: true,
        habitaciones: true,
        banos: true,
        precio: true,
        estado: true,
        estadoPropiedad: true,
      },
    });

    if (!propiedad) return null;

    return {
      ...propiedad,
      precio: Number(propiedad.precio),
      tamano: Number(propiedad.tamano),
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
    } else if (inmuebleTipo === TipoInmueble.PROPIEDAD) {
      const propiedad = await this.prisma.propiedad.findUnique({
        where: { id: inmuebleId },
      });
      if (!propiedad) {
        throw new BadRequestException('Propiedad no encontrada');
      }
    }
  }

  async create(createVisitaDto: CreateVisitaDto, usuarioId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const rolesPermitidos = ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'];
        if (!rolesPermitidos.includes(usuario.role)) {
          throw new ForbiddenException(
            'No tienes permisos para crear visitas. Se requiere rol de ASESOR, ADMINISTRADOR o SECRETARIA',
          );
        }

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

        await this.validateInmueble(
          createVisitaDto.inmuebleTipo,
          createVisitaDto.inmuebleId,
        );

        const fechaVisita = new Date(createVisitaDto.fechaVisita);
        const ahora = this.getCurrentTimeLaPaz();

        if (fechaVisita < ahora) {
          throw new BadRequestException(
            'La fecha de visita no puede ser en el pasado',
          );
        }

        const visita = await prisma.visita.create({
          data: {
            clienteId: createVisitaDto.clienteId,
            asesorId: usuarioId,
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

        await this.crearAuditoria(
          usuarioId,
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

      const visitasConInfo = await Promise.all(
        visitas.map(async (visita) => {
          let inmuebleInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE) {
            inmuebleInfo = await this.getLoteInfo(visita.inmuebleId);
          } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD) {
            inmuebleInfo = await this.getPropiedadInfo(visita.inmuebleId);
          }

          return {
            ...visita,
            inmueble: inmuebleInfo,
          };
        }),
      );

      return { success: true, data: visitasConInfo };
    } catch (error) {
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

      let inmuebleInfo: any = null;
      if (visita.inmuebleTipo === TipoInmueble.LOTE) {
        inmuebleInfo = await this.getLoteInfo(visita.inmuebleId);
      } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD) {
        inmuebleInfo = await this.getPropiedadInfo(visita.inmuebleId);
      }

      const visitaConInmueble = {
        ...visita,
        inmueble: inmuebleInfo,
      };

      return { success: true, data: visitaConInmueble };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const rolesPermitidos = ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'];
        if (!rolesPermitidos.includes(usuario.role)) {
          throw new ForbiddenException(
            'No tienes permisos para actualizar visitas. Se requiere rol de ASESOR, ADMINISTRADOR o SECRETARIA',
          );
        }

        const visitaExistente = await prisma.visita.findUnique({
          where: { id },
        });

        if (!visitaExistente) {
          throw new NotFoundException(`Visita con ID ${id} no encontrada`);
        }

        const datosAntes = { ...visitaExistente };

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

        if (updateVisitaDto.inmuebleTipo && updateVisitaDto.inmuebleId) {
          await this.validateInmueble(
            updateVisitaDto.inmuebleTipo,
            updateVisitaDto.inmuebleId,
          );
        }

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
        error instanceof ForbiddenException ||
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
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const rolesPermitidos = ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'];
        if (!rolesPermitidos.includes(usuario.role)) {
          throw new ForbiddenException(
            'No tienes permisos para eliminar visitas. Se requiere rol de ASESOR, ADMINISTRADOR o SECRETARIA',
          );
        }

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
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
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

      const visitasConInfo = await Promise.all(
        visitas.map(async (visita) => {
          let inmuebleInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE) {
            inmuebleInfo = await this.getLoteInfo(visita.inmuebleId);
          } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD) {
            inmuebleInfo = await this.getPropiedadInfo(visita.inmuebleId);
          }

          return {
            ...visita,
            inmueble: inmuebleInfo,
          };
        }),
      );

      return {
        success: true,
        data: { cliente, visitas: visitasConInfo },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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

      const visitasConInfo = await Promise.all(
        visitas.map(async (visita) => {
          let inmuebleInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE) {
            inmuebleInfo = await this.getLoteInfo(visita.inmuebleId);
          } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD) {
            inmuebleInfo = await this.getPropiedadInfo(visita.inmuebleId);
          }

          return {
            ...visita,
            inmueble: inmuebleInfo,
          };
        }),
      );

      return {
        success: true,
        data: { asesor, visitas: visitasConInfo },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
