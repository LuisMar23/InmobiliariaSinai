import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateReservaDto,
  TipoInmueble,
  EstadoReserva,
  UserRole,
} from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@Injectable()
export class ReservasService {
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

  private validarFechasReserva(
    fechaInicio: Date,
    fechaVencimiento: Date,
  ): void {
    const ahora = this.getCurrentTimeLaPaz();
    const inicioMinimo = new Date(ahora);
    inicioMinimo.setHours(0, 0, 0, 0);

    if (fechaInicio < inicioMinimo) {
      throw new BadRequestException('La fecha de inicio debe ser hoy o futura');
    }

    if (fechaInicio >= fechaVencimiento) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de vencimiento',
      );
    }
  }

  async create(createReservaDto: CreateReservaDto, asesorId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const fechaInicio = new Date(createReservaDto.fechaInicio);
        const fechaVencimiento = new Date(createReservaDto.fechaVencimiento);

        this.validarFechasReserva(fechaInicio, fechaVencimiento);

        const asesor = await prisma.user.findFirst({
          where: {
            id: asesorId,
            isActive: true,
            role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
          },
        });

        if (!asesor) {
          throw new ForbiddenException(
            'No tienes permisos para crear reservas',
          );
        }

        const cliente = await prisma.user.findFirst({
          where: {
            id: createReservaDto.clienteId,
            isActive: true,
            role: 'CLIENTE',
          },
        });

        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }

        if (createReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
          const lote = await prisma.lote.findUnique({
            where: { id: createReservaDto.inmuebleId },
          });

          if (!lote) {
            throw new BadRequestException('Lote no encontrado');
          }

          if (lote.estado !== 'DISPONIBLE') {
            throw new BadRequestException(
              'El lote no está disponible para reserva',
            );
          }
        }

        const reserva = await prisma.reserva.create({
          data: {
            clienteId: createReservaDto.clienteId,
            asesorId: asesorId,
            inmuebleTipo: createReservaDto.inmuebleTipo,
            inmuebleId: createReservaDto.inmuebleId,
            montoReserva: createReservaDto.montoReserva,
            fechaInicio: fechaInicio,
            fechaVencimiento: fechaVencimiento,
            estado: createReservaDto.estado || EstadoReserva.ACTIVA,
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

        if (createReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: createReservaDto.inmuebleId },
            data: { estado: 'RESERVADO' },
          });
        }

        await this.crearAuditoria(
          asesorId,
          'CREAR_RESERVA',
          'Reserva',
          reserva.id,
          null,
          {
            clienteId: reserva.clienteId,
            asesorId: reserva.asesorId,
            inmuebleTipo: reserva.inmuebleTipo,
            inmuebleId: reserva.inmuebleId,
            montoReserva: reserva.montoReserva,
            fechaInicio: reserva.fechaInicio,
            fechaVencimiento: reserva.fechaVencimiento,
            estado: reserva.estado,
          },
        );

        return {
          success: true,
          message: 'Reserva creada correctamente',
          data: reserva,
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

      const reservas = await this.prisma.reserva.findMany({
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

      const ahora = this.getCurrentTimeLaPaz();
      const reservasActualizadas = await Promise.all(
        reservas.map(async (reserva) => {
          if (
            reserva.estado === EstadoReserva.ACTIVA &&
            reserva.fechaVencimiento < ahora
          ) {
            const reservaActualizada = await this.prisma.reserva.update({
              where: { id: reserva.id },
              data: { estado: EstadoReserva.VENCIDA },
            });

            if (reservaActualizada.inmuebleTipo === TipoInmueble.LOTE) {
              await this.prisma.lote.update({
                where: { id: reservaActualizada.inmuebleId },
                data: { estado: 'DISPONIBLE' },
              });
            }

            return {
              ...reservaActualizada,
              cliente: reserva.cliente,
              asesor: reserva.asesor,
            };
          }
          return reserva;
        }),
      );

      const reservasConLotes = await Promise.all(
        reservasActualizadas.map(async (reserva) => {
          let loteInfo: any = null;

          if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
            const lote = await this.prisma.lote.findUnique({
              where: { id: reserva.inmuebleId },
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
            ...reserva,
            lote: loteInfo,
          };
        }),
      );

      return { success: true, data: reservasConLotes };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
      const reserva = await this.prisma.reserva.findUnique({
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

      if (!reserva) {
        throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      }

      const ahora = this.getCurrentTimeLaPaz();
      if (
        reserva.estado === EstadoReserva.ACTIVA &&
        reserva.fechaVencimiento < ahora
      ) {
        const reservaActualizada = await this.prisma.reserva.update({
          where: { id: reserva.id },
          data: { estado: EstadoReserva.VENCIDA },
        });

        if (reservaActualizada.inmuebleTipo === TipoInmueble.LOTE) {
          await this.prisma.lote.update({
            where: { id: reservaActualizada.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }
      }

      let loteInfo: any = null;
      if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
        const lote = await this.prisma.lote.findUnique({
          where: { id: reserva.inmuebleId },
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

      const reservaActual = await this.prisma.reserva.findUnique({
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

      const reservaConLote = {
        ...reservaActual,
        lote: loteInfo,
      };

      return { success: true, data: reservaConLote };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async update(
    id: number,
    updateReservaDto: UpdateReservaDto,
    usuarioId: number,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await prisma.user.findFirst({
          where: {
            id: usuarioId,
            isActive: true,
            role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
          },
        });

        if (!usuario) {
          throw new ForbiddenException(
            'No tienes permisos para actualizar reservas',
          );
        }

        const reservaExistente = await prisma.reserva.findUnique({
          where: { id },
        });

        if (!reservaExistente) {
          throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
        }

        const datosAntes = { ...reservaExistente };

        let fechaInicio = reservaExistente.fechaInicio;
        let fechaVencimiento = reservaExistente.fechaVencimiento;

        if (updateReservaDto.fechaInicio) {
          fechaInicio = new Date(updateReservaDto.fechaInicio);
        }
        if (updateReservaDto.fechaVencimiento) {
          fechaVencimiento = new Date(updateReservaDto.fechaVencimiento);
        }

        if (updateReservaDto.fechaInicio || updateReservaDto.fechaVencimiento) {
          this.validarFechasReserva(fechaInicio, fechaVencimiento);
        }

        if (updateReservaDto.clienteId) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateReservaDto.clienteId,
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

        const reservaActualizada = await prisma.reserva.update({
          where: { id },
          data: {
            ...updateReservaDto,
            ...(updateReservaDto.fechaInicio && { fechaInicio }),
            ...(updateReservaDto.fechaVencimiento && { fechaVencimiento }),
          },
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
          'ACTUALIZAR_RESERVA',
          'Reserva',
          id,
          datosAntes,
          reservaActualizada,
        );

        return {
          success: true,
          message: 'Reserva actualizada correctamente',
          data: reservaActualizada,
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
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
          where: {
            id: usuarioId,
            isActive: true,
            role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
          },
        });

        if (!usuario) {
          throw new ForbiddenException(
            'No tienes permisos para eliminar reservas',
          );
        }

        const reserva = await prisma.reserva.findUnique({
          where: { id },
        });

        if (!reserva) {
          throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
        }

        const datosAntes = { ...reserva };

        await prisma.reserva.delete({ where: { id } });

        if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: reserva.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_RESERVA',
          'Reserva',
          id,
          datosAntes,
          null,
        );

        return { success: true, message: 'Reserva eliminada correctamente' };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getReservasPorCliente(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findFirst({
        where: { id: clienteId, isActive: true, role: 'CLIENTE' },
      });

      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const reservas = await this.prisma.reserva.findMany({
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

      const ahora = this.getCurrentTimeLaPaz();
      const reservasActualizadas = await Promise.all(
        reservas.map(async (reserva) => {
          if (
            reserva.estado === EstadoReserva.ACTIVA &&
            reserva.fechaVencimiento < ahora
          ) {
            const reservaActualizada = await this.prisma.reserva.update({
              where: { id: reserva.id },
              data: { estado: EstadoReserva.VENCIDA },
            });

            if (reservaActualizada.inmuebleTipo === TipoInmueble.LOTE) {
              await this.prisma.lote.update({
                where: { id: reservaActualizada.inmuebleId },
                data: { estado: 'DISPONIBLE' },
              });
            }

            return {
              ...reservaActualizada,
              asesor: reserva.asesor,
            };
          }
          return reserva;
        }),
      );

      const reservasConLotes = await Promise.all(
        reservasActualizadas.map(async (reserva) => {
          let loteInfo: any = null;

          if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
            const lote = await this.prisma.lote.findUnique({
              where: { id: reserva.inmuebleId },
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
            ...reserva,
            lote: loteInfo,
          };
        }),
      );

      return {
        success: true,
        data: { cliente, reservas: reservasConLotes },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
