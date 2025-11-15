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
  MetodoPago,
} from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offset = -4 * 60;
    return new Date(now.getTime() + offset * 60 * 1000);
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
          usuarioId,
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

  private async verificarCajaActiva(cajaId: number, prisma: any) {
    const caja = await prisma.caja.findUnique({
      where: { id: cajaId },
    });
    if (!caja) {
      throw new BadRequestException(`Caja con ID ${cajaId} no encontrada`);
    }
    if (caja.estado !== 'ABIERTA') {
      throw new BadRequestException(`La caja con ID ${cajaId} no está abierta`);
    }
    return caja;
  }

  private async registrarMovimientoCajaReserva(
    cajaId: number,
    monto: number,
    reserva: any,
    usuarioId: number,
    metodoPago: MetodoPago = MetodoPago.EFECTIVO,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const caja = await this.verificarCajaActiva(cajaId, prisma);

      const movimiento = await prisma.movimientoCaja.create({
        data: {
          cajaId,
          usuarioId,
          tipo: 'INGRESO',
          monto,
          descripcion: `Reserva #${reserva.id} - Cliente ID: ${reserva.clienteId}`,
          metodoPago,
          referencia: `Reserva-${reserva.id}`,
        },
      });

      const nuevoSaldo = Number(caja.saldoActual) + Number(monto);
      await prisma.caja.update({
        where: { id: cajaId },
        data: { saldoActual: nuevoSaldo },
      });

      await this.crearAuditoria(
        usuarioId,
        'CREAR_MOVIMIENTO_CAJA_RESERVA',
        'MovimientoCaja',
        movimiento.id,
        null,
        { cajaId, monto, reservaId: reserva.id, tipo: 'INGRESO', metodoPago },
      );

      return movimiento;
    });
  }

  private async revertirMovimientoCajaReserva(
    cajaId: number,
    monto: number,
    reserva: any,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const caja = await this.verificarCajaActiva(cajaId, prisma);

      const movimiento = await prisma.movimientoCaja.create({
        data: {
          cajaId,
          usuarioId,
          tipo: 'EGRESO',
          monto,
          descripcion: `Reversión de reserva #${reserva.id} - Cliente ID: ${reserva.clienteId}`,
          metodoPago: MetodoPago.EFECTIVO,
          referencia: `Reserva-${reserva.id}-Reversion`,
        },
      });

      const nuevoSaldo = Number(caja.saldoActual) - Number(monto);
      await prisma.caja.update({
        where: { id: cajaId },
        data: { saldoActual: nuevoSaldo },
      });

      await this.crearAuditoria(
        usuarioId,
        'REVERTIR_MOVIMIENTO_CAJA_RESERVA',
        'MovimientoCaja',
        movimiento.id,
        null,
        { cajaId, monto, reservaId: reserva.id, tipo: 'EGRESO' },
      );

      return movimiento;
    });
  }

  private async obtenerCajaOriginalReserva(reservaId: number): Promise<number> {
    const movimientoCaja = await this.prisma.movimientoCaja.findFirst({
      where: { referencia: { contains: `Reserva-${reservaId}` } },
      orderBy: { fecha: 'asc' },
    });

    if (!movimientoCaja) {
      throw new BadRequestException(
        'No se encontró caja asociada a esta reserva',
      );
    }

    return movimientoCaja.cajaId;
  }

  private async actualizarMovimientoCajaReserva(
    cajaId: number,
    montoAnterior: number,
    montoNuevo: number,
    reserva: any,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const caja = await this.verificarCajaActiva(cajaId, prisma);

      const diferencia = montoNuevo - montoAnterior;

      if (diferencia !== 0) {
        const movimiento = await prisma.movimientoCaja.create({
          data: {
            cajaId,
            usuarioId,
            tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
            monto: Math.abs(diferencia),
            descripcion: `Ajuste de reserva #${reserva.id} - ${diferencia > 0 ? 'Incremento' : 'Decremento'} de monto`,
            metodoPago: MetodoPago.EFECTIVO,
            referencia: `Reserva-${reserva.id}-Ajuste`,
          },
        });

        const nuevoSaldo = Number(caja.saldoActual) + diferencia;
        await prisma.caja.update({
          where: { id: cajaId },
          data: { saldoActual: nuevoSaldo },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_MOVIMIENTO_CAJA_RESERVA',
          'MovimientoCaja',
          movimiento.id,
          null,
          {
            cajaId,
            diferencia,
            reservaId: reserva.id,
            tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
          },
        );

        return movimiento;
      }
      return null;
    });
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

  async getCajasAbiertas() {
    try {
      const cajasAbiertas = await this.prisma.caja.findMany({
        where: {
          estado: 'ABIERTA',
        },
        select: {
          id: true,
          nombre: true,
          montoInicial: true,
          saldoActual: true,
          estado: true,
          usuarioApertura: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
          creadoEn: true,
          actualizadoEn: true,
        },
        orderBy: {
          creadoEn: 'desc',
        },
      });

      return {
        success: true,
        data: cajasAbiertas,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las cajas abiertas',
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

        await this.verificarCajaActiva(createReservaDto.cajaId, prisma);

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
            asesorId,
            inmuebleTipo: createReservaDto.inmuebleTipo,
            inmuebleId: createReservaDto.inmuebleId,
            montoReserva: createReservaDto.montoReserva,
            fechaInicio,
            fechaVencimiento,
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

        await this.registrarMovimientoCajaReserva(
          createReservaDto.cajaId,
          createReservaDto.montoReserva,
          reserva,
          asesorId,
          createReservaDto.metodoPago || MetodoPago.EFECTIVO,
        );

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
            cajaId: createReservaDto.cajaId,
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
                  select: { id: true, nombre: true, ubicacion: true },
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

          return { ...reserva, lote: loteInfo };
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
              select: { id: true, nombre: true, ubicacion: true },
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

      return { success: true, data: { ...reservaActual, lote: loteInfo } };
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

        const dataActualizada: any = {};

        // Solo incluir campos que están presentes en el DTO y han cambiado
        if (
          updateReservaDto.clienteId !== undefined &&
          updateReservaDto.clienteId !== reservaExistente.clienteId
        ) {
          dataActualizada.clienteId = updateReservaDto.clienteId;
        }

        if (
          updateReservaDto.montoReserva !== undefined &&
          updateReservaDto.montoReserva !==
            Number(reservaExistente.montoReserva)
        ) {
          dataActualizada.montoReserva = updateReservaDto.montoReserva;
        }

        if (
          updateReservaDto.estado !== undefined &&
          updateReservaDto.estado !== reservaExistente.estado
        ) {
          dataActualizada.estado = updateReservaDto.estado;
        }

        if (
          updateReservaDto.inmuebleTipo !== undefined &&
          updateReservaDto.inmuebleTipo !== reservaExistente.inmuebleTipo
        ) {
          dataActualizada.inmuebleTipo = updateReservaDto.inmuebleTipo;
        }

        if (
          updateReservaDto.inmuebleId !== undefined &&
          updateReservaDto.inmuebleId !== reservaExistente.inmuebleId
        ) {
          dataActualizada.inmuebleId = updateReservaDto.inmuebleId;
        }

        // Manejo especial para fechas - solo procesar si están presentes y han cambiado
        let fechaInicioCambio = false;
        let fechaVencimientoCambio = false;

        if (updateReservaDto.fechaInicio !== undefined) {
          const nuevaFechaInicio = new Date(updateReservaDto.fechaInicio);
          const fechaExistenteInicio = new Date(reservaExistente.fechaInicio);

          // Comparar solo la fecha (sin hora) para evitar problemas de timezone
          if (
            nuevaFechaInicio.toISOString().split('T')[0] !==
            fechaExistenteInicio.toISOString().split('T')[0]
          ) {
            fechaInicioCambio = true;
            dataActualizada.fechaInicio = nuevaFechaInicio;
          }
        }

        if (updateReservaDto.fechaVencimiento !== undefined) {
          const nuevaFechaVencimiento = new Date(
            updateReservaDto.fechaVencimiento,
          );
          const fechaExistenteVencimiento = new Date(
            reservaExistente.fechaVencimiento,
          );

          // Comparar solo la fecha (sin hora) para evitar problemas de timezone
          if (
            nuevaFechaVencimiento.toISOString().split('T')[0] !==
            fechaExistenteVencimiento.toISOString().split('T')[0]
          ) {
            fechaVencimientoCambio = true;
            dataActualizada.fechaVencimiento = nuevaFechaVencimiento;
          }
        }

        // Solo validar fechas si la fecha de inicio ha cambiado
        if (fechaInicioCambio) {
          const fechaInicio =
            dataActualizada.fechaInicio || reservaExistente.fechaInicio;
          const fechaVencimiento =
            dataActualizada.fechaVencimiento ||
            reservaExistente.fechaVencimiento;
          this.validarFechasReserva(fechaInicio, fechaVencimiento);
        }

        // Validar cliente si se está cambiando
        if (
          updateReservaDto.clienteId !== undefined &&
          updateReservaDto.clienteId !== reservaExistente.clienteId
        ) {
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

        // Actualizar movimiento de caja si el monto cambió
        if (
          updateReservaDto.montoReserva !== undefined &&
          updateReservaDto.montoReserva !==
            Number(reservaExistente.montoReserva)
        ) {
          const cajaId = await this.obtenerCajaOriginalReserva(id);
          await this.actualizarMovimientoCajaReserva(
            cajaId,
            Number(reservaExistente.montoReserva),
            updateReservaDto.montoReserva,
            reservaExistente,
            usuarioId,
          );
        }

        // Si no hay cambios, retornar sin actualizar
        if (Object.keys(dataActualizada).length === 0) {
          return {
            success: true,
            message: 'No hay cambios para actualizar',
            data: reservaExistente,
          };
        }

        const reservaActualizada = await prisma.reserva.update({
          where: { id },
          data: dataActualizada,
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

        try {
          const cajaId = await this.obtenerCajaOriginalReserva(id);
          await this.revertirMovimientoCajaReserva(
            cajaId,
            Number(reserva.montoReserva),
            reserva,
            usuarioId,
          );
        } catch (error) {
          console.warn(
            'No se pudo revertir movimiento de caja:',
            error.message,
          );
        }

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
        where: { clienteId },
        include: {
          asesor: {
            select: { id: true, fullName: true, telefono: true, role: true },
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

            return { ...reservaActualizada, asesor: reserva.asesor };
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
                  select: { id: true, nombre: true, ubicacion: true },
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

          return { ...reserva, lote: loteInfo };
        }),
      );

      return { success: true, data: { cliente, reservas: reservasConLotes } };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
