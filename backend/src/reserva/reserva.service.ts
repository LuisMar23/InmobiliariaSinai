import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
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

  private validarFechasReserva(
    fechaInicio: Date,
    fechaVencimiento: Date,
  ): void {
    if (fechaInicio >= fechaVencimiento) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de vencimiento',
      );
    }

    const ahora = new Date();
    if (fechaInicio < ahora) {
      throw new BadRequestException('La fecha de inicio debe ser futura');
    }
  }

  async create(createReservaDto: CreateReservaDto) {
    return this.prisma.$transaction(async (prisma) => {
      const fechaInicio = new Date(createReservaDto.fechaInicio);
      const fechaVencimiento = new Date(createReservaDto.fechaVencimiento);

      // Validar fechas
      this.validarFechasReserva(fechaInicio, fechaVencimiento);

      // Verificar que cliente existe y tiene rol CLIENTE
      const cliente = await prisma.user.findUnique({
        where: {
          id: createReservaDto.clienteId,
          isActive: true,
        },
      });

      if (!cliente) {
        throw new BadRequestException('Cliente no encontrado');
      }
      if (cliente.role !== UserRole.CLIENTE) {
        throw new BadRequestException(
          'El usuario especificado no tiene rol de CLIENTE',
        );
      }

      // Verificar que asesor existe y tiene rol ASESOR
      const asesor = await prisma.user.findUnique({
        where: {
          id: createReservaDto.asesorId,
          isActive: true,
        },
      });

      if (!asesor) {
        throw new BadRequestException('Asesor no encontrado');
      }
      if (asesor.role !== UserRole.ASESOR) {
        throw new BadRequestException(
          'El usuario especificado no tiene rol de ASESOR',
        );
      }

      // Verificar que el inmueble existe y está disponible
      let inmueble;
      if (createReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
        inmueble = await prisma.lote.findUnique({
          where: { id: createReservaDto.inmuebleId },
        });
        if (!inmueble) {
          throw new BadRequestException('Lote no encontrado');
        }
        if (inmueble.estado !== 'DISPONIBLE') {
          throw new BadRequestException(
            'El lote no está disponible para reserva',
          );
        }
      }

      const reserva = await prisma.reserva.create({
        data: {
          clienteId: createReservaDto.clienteId,
          asesorId: createReservaDto.asesorId,
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
            createReservaDto.inmuebleTipo === TipoInmueble.LOTE
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

      // Actualizar estado del inmueble
      if (createReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
        await prisma.lote.update({
          where: { id: createReservaDto.inmuebleId },
          data: { estado: 'RESERVADO' },
        });
      }

      await this.crearAuditoria(
        createReservaDto.usuarioId,
        'CREAR',
        'Reserva',
        reserva.id,
        null,
        reserva,
      );

      return {
        success: true,
        message: 'Reserva creada correctamente',
        data: reserva,
      };
    });
  }

  async findAll(clienteId?: number, estado?: string) {
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
        documentos: {
          select: {
            id: true,
            tipo: true,
            urlArchivo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: reservas,
    };
  }

  async findOne(id: number) {
    const reserva = await this.prisma.reserva.findUnique({
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
        documentos: {
          include: {
            usuario: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return {
      success: true,
      data: reserva,
    };
  }

  async update(id: number, updateReservaDto: UpdateReservaDto) {
    return this.prisma.$transaction(async (prisma) => {
      const reservaExistente = await prisma.reserva.findUnique({
        where: { id },
      });

      if (!reservaExistente) {
        throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      }

      const datosAntes = { ...reservaExistente };

      // Validar fechas si se están actualizando
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

      // Verificar relaciones si se están actualizando
      if (updateReservaDto.clienteId) {
        const cliente = await prisma.user.findUnique({
          where: {
            id: updateReservaDto.clienteId,
            isActive: true,
          },
        });
        if (!cliente) {
          throw new BadRequestException('Cliente no encontrado');
        }
        if (cliente.role !== UserRole.CLIENTE) {
          throw new BadRequestException(
            'El usuario especificado no tiene rol de CLIENTE',
          );
        }
      }

      if (updateReservaDto.asesorId) {
        const asesor = await prisma.user.findUnique({
          where: {
            id: updateReservaDto.asesorId,
            isActive: true,
          },
        });
        if (!asesor) {
          throw new BadRequestException('Asesor no encontrado');
        }
        if (asesor.role !== UserRole.ASESOR) {
          throw new BadRequestException(
            'El usuario especificado no tiene rol de ASESOR',
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
        },
      });

      await this.crearAuditoria(
        updateReservaDto.usuarioId,
        'ACTUALIZAR',
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
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const reserva = await prisma.reserva.findUnique({
        where: { id },
        include: {
          documentos: true,
        },
      });

      if (!reserva) {
        throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      }

      // Verificar si tiene relaciones
      if (reserva.documentos.length > 0) {
        throw new BadRequestException(
          'No se puede eliminar la reserva porque tiene documentos asociados',
        );
      }

      const datosAntes = { ...reserva };

      await prisma.reserva.delete({
        where: { id },
      });

      // Restaurar estado del inmueble
      if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
        await prisma.lote.update({
          where: { id: reserva.inmuebleId },
          data: { estado: 'DISPONIBLE' },
        });
      }

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Reserva',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Reserva eliminada correctamente',
      };
    });
  }
}
