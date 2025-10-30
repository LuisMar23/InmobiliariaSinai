import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateVentaDto,
  EstadoVenta,
  TipoInmueble,
  CreatePlanPagoDto,
  RegistrarPagoDto,
  EstadoPlanPago,
  UpdateVentaDto,
  PeriodicidadPago,
} from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    datosAntes?: any,
    datosDespues?: any,
    ip?: string,
    userAgent?: string,
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
          ip: ip || '127.0.0.1',
          dispositivo: userAgent || 'API',
          createdAt: new Date(),
        },
      });
    } catch (error) {}
  }

  private calcularFechaVencimiento(
    fechaInicio: Date,
    plazo: number,
    periodicidad: PeriodicidadPago,
  ): Date {
    const fecha = new Date(fechaInicio);

    switch (periodicidad) {
      case PeriodicidadPago.DIAS:
        fecha.setDate(fecha.getDate() + plazo);
        break;
      case PeriodicidadPago.SEMANAS:
        fecha.setDate(fecha.getDate() + plazo * 7);
        break;
      case PeriodicidadPago.MESES:
        fecha.setMonth(fecha.getMonth() + plazo);
        break;
      default:
        fecha.setDate(fecha.getDate() + plazo);
    }

    return fecha;
  }

  private calcularTotalPagado(pagos: any[]): number {
    return pagos.reduce(
      (sum: number, pago: any) => sum + Number(pago.monto),
      0,
    );
  }

  private validarPlanPago(planPagoDto: CreatePlanPagoDto, precioVenta: number) {
    if (planPagoDto.monto_inicial > precioVenta) {
      throw new BadRequestException(
        `El monto inicial (Bs. ${planPagoDto.monto_inicial}) no puede ser mayor al precio de venta (Bs. ${precioVenta})`,
      );
    }

    if (planPagoDto.monto_inicial < 0) {
      throw new BadRequestException('El monto inicial no puede ser negativo');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaInicio = new Date(planPagoDto.fecha_inicio);
    fechaInicio.setHours(0, 0, 0, 0);

    if (fechaInicio < hoy) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser en el pasado',
      );
    }

    if (planPagoDto.plazo <= 0) {
      throw new BadRequestException('El plazo debe ser mayor a 0');
    }
  }

  private async registrarMovimientoCaja(
    pagoData: any,
    venta: any,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: usuarioId },
    });
    
    if (!usuario || !['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'].includes(usuario.role)) {
      throw new ForbiddenException(
        'No tienes permisos para registrar movimientos de caja',
      );
    }

    const caja = await this.prisma.caja.findFirst({
      where: { estado: 'ABIERTA' },
    });

    if (!caja) {
      throw new BadRequestException(
        'No hay caja abierta para registrar el movimiento',
      );
    }

    const tipoMovimiento = 'INGRESO';
    const descripcion = `Pago de venta #${venta.id} - Cliente: ${venta.cliente.fullName} - Lote: ${venta.lote?.numeroLote || 'N/A'}`;

    const movimiento = await this.prisma.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        usuarioId: usuarioId,
        tipo: tipoMovimiento,
        monto: pagoData.monto,
        descripcion: descripcion,
        metodoPago: pagoData.metodoPago || 'EFECTIVO',
        referencia: `Venta-${venta.id}-Pago-${pagoData.pagoId || 'Inicial'}`,
      },
    });

    const nuevoSaldo = Number(caja.saldoActual) + Number(pagoData.monto);
    await this.prisma.caja.update({
      where: { id: caja.id },
      data: { saldoActual: nuevoSaldo },
    });

    await this.crearAuditoria(
      usuarioId,
      'MOVIMIENTO_CAJA_VENTA',
      'MovimientoCaja',
      movimiento.id,
      null,
      movimiento,
      ip,
      userAgent,
    );

    return movimiento;
  }

  async create(
    createVentaDto: CreateVentaDto,
    asesorId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const asesor = await prisma.user.findFirst({
          where: {
            id: asesorId,
            isActive: true,
            role: 'ASESOR',
          },
        });

        if (!asesor) {
          throw new ForbiddenException('Solo los asesores pueden crear ventas');
        }

        const cliente = await prisma.user.findFirst({
          where: {
            id: createVentaDto.clienteId,
            isActive: true,
            role: 'CLIENTE',
          },
        });

        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }

        let inmueble;
        if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
          inmueble = await prisma.lote.findUnique({
            where: { id: createVentaDto.inmuebleId },
          });
          if (!inmueble) {
            throw new BadRequestException('Lote no encontrado');
          }
          if (
            inmueble.estado !== 'DISPONIBLE' &&
            inmueble.estado !== 'CON_OFERTA'
          ) {
            throw new BadRequestException(
              'El lote no está disponible para venta',
            );
          }
        }

        if (createVentaDto.plan_pago) {
          this.validarPlanPago(
            createVentaDto.plan_pago,
            createVentaDto.precioFinal,
          );
        }

        const venta = await prisma.venta.create({
          data: {
            clienteId: createVentaDto.clienteId,
            asesorId: asesorId,
            inmuebleTipo: createVentaDto.inmuebleTipo,
            inmuebleId: createVentaDto.inmuebleId,
            precioFinal: createVentaDto.precioFinal,
            estado: createVentaDto.estado || EstadoVenta.PENDIENTE_PAGO,
          },
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                ci: true,
                telefono: true,
                direccion: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
                email: true,
                telefono: true,
              },
            },
          },
        });

        if (createVentaDto.plan_pago) {
          const fechaVencimiento = this.calcularFechaVencimiento(
            createVentaDto.plan_pago.fecha_inicio,
            createVentaDto.plan_pago.plazo,
            createVentaDto.plan_pago.periodicidad,
          );

          const planPago = await prisma.planPago.create({
            data: {
              ventaId: venta.id,
              total: createVentaDto.precioFinal,
              monto_inicial: createVentaDto.plan_pago.monto_inicial,
              plazo: createVentaDto.plan_pago.plazo,
              periodicidad: createVentaDto.plan_pago.periodicidad,
              fecha_inicio: createVentaDto.plan_pago.fecha_inicio,
              fecha_vencimiento: fechaVencimiento,
              estado: EstadoPlanPago.ACTIVO,
            },
          });

          if (createVentaDto.plan_pago.monto_inicial > 0) {
            await prisma.pagoPlanPago.create({
              data: {
                plan_pago_id: planPago.id_plan_pago,
                monto: createVentaDto.plan_pago.monto_inicial,
                fecha_pago: new Date(),
                observacion: 'Pago inicial',
              },
            });

            await this.registrarMovimientoCaja(
              {
                monto: createVentaDto.plan_pago.monto_inicial,
                metodoPago: 'EFECTIVO',
                pagoId: planPago.id_plan_pago,
              },
              venta,
              asesorId,
              ip,
              userAgent,
            );

            if (
              createVentaDto.plan_pago.monto_inicial >=
              createVentaDto.precioFinal
            ) {
              await prisma.planPago.update({
                where: { id_plan_pago: planPago.id_plan_pago },
                data: { estado: EstadoPlanPago.PAGADO },
              });

              await prisma.venta.update({
                where: { id: venta.id },
                data: { estado: EstadoVenta.PAGADO },
              });
            }
          }
        } else {
          if (createVentaDto.estado === EstadoVenta.PAGADO) {
            const planPago = await prisma.planPago.create({
              data: {
                ventaId: venta.id,
                total: createVentaDto.precioFinal,
                monto_inicial: createVentaDto.precioFinal,
                plazo: 0,
                periodicidad: PeriodicidadPago.DIAS,
                fecha_inicio: new Date(),
                fecha_vencimiento: new Date(),
                estado: EstadoPlanPago.PAGADO,
              },
            });

            await prisma.pagoPlanPago.create({
              data: {
                plan_pago_id: planPago.id_plan_pago,
                monto: createVentaDto.precioFinal,
                fecha_pago: new Date(),
                observacion: 'Pago completo al contado',
              },
            });

            await this.registrarMovimientoCaja(
              {
                monto: createVentaDto.precioFinal,
                metodoPago: 'EFECTIVO',
                pagoId: planPago.id_plan_pago,
              },
              venta,
              asesorId,
              ip,
              userAgent,
            );
          }
        }

        if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: createVentaDto.inmuebleId },
            data: { estado: 'VENDIDO' },
          });
        }

        await this.crearAuditoria(
          asesorId,
          'CREAR_VENTA',
          'Venta',
          venta.id,
          null,
          venta,
          ip,
          userAgent,
        );

        const ventaCompleta = await prisma.venta.findUnique({
          where: { id: venta.id },
          include: {
            cliente: true,
            asesor: true,
            lote: {
              include: {
                urbanizacion: true,
              },
            },
            planPago: {
              include: {
                pagos: true,
              },
            },
          },
        });

        return {
          success: true,
          message: 'Venta creada correctamente',
          data: this.agregarCalculosVenta(ventaCompleta),
        };
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  private agregarCalculosVenta(venta: any) {
    if (!venta) return venta;

    if (venta.planPago) {
      const totalPagado = this.calcularTotalPagado(venta.planPago.pagos);
      const saldoPendiente = Number(venta.planPago.total) - totalPagado;

      venta.planPago.saldo_pendiente = saldoPendiente;
      venta.planPago.total_pagado = totalPagado;
      venta.planPago.porcentaje_pagado =
        Number(venta.planPago.total) > 0
          ? (totalPagado / Number(venta.planPago.total)) * 100
          : 0;
    }

    return venta;
  }

  async findAll(clienteId?: number, asesorId?: number) {
    try {
      const where: any = {};
      if (clienteId) where.clienteId = clienteId;
      if (asesorId) where.asesorId = asesorId;

      const ventas = await this.prisma.venta.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              telefono: true,
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
          planPago: {
            include: {
              pagos: {
                orderBy: {
                  fecha_pago: 'desc',
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const ventasConCalculos = ventas.map((venta) =>
        this.agregarCalculosVenta(venta),
      );

      return {
        success: true,
        data: { ventas: ventasConCalculos },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id },
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
              direccion: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              telefono: true,
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
          planPago: {
            include: {
              pagos: {
                orderBy: {
                  fecha_pago: 'desc',
                },
              },
            },
          },
        },
      });

      if (!venta) {
        throw new NotFoundException(`Venta con ID ${id} no encontrada`);
      }

      return {
        success: true,
        data: { venta: this.agregarCalculosVenta(venta) },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async update(
    id: number,
    updateVentaDto: UpdateVentaDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const ventaExistente = await prisma.venta.findUnique({
          where: { id },
        });

        if (!ventaExistente) {
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);
        }

        const datosAntes = { ...ventaExistente };

        if (updateVentaDto.clienteId) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateVentaDto.clienteId,
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

        const ventaActualizada = await prisma.venta.update({
          where: { id },
          data: updateVentaDto,
          include: {
            cliente: true,
            asesor: true,
            lote: {
              include: {
                urbanizacion: true,
              },
            },
            planPago: {
              include: {
                pagos: true,
              },
            },
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_VENTA',
          'Venta',
          id,
          datosAntes,
          ventaActualizada,
          ip,
          userAgent,
        );

        return {
          success: true,
          message: 'Venta actualizada correctamente',
          data: { venta: this.agregarCalculosVenta(ventaActualizada) },
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

  async remove(id: number, usuarioId: number, ip?: string, userAgent?: string) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const venta = await prisma.venta.findUnique({
          where: { id },
          include: {
            planPago: {
              include: {
                pagos: true,
              },
            },
            documentos: true,
            ingresos: true,
          },
        });

        if (!venta) {
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);
        }

        if (venta.documentos.length > 0 || venta.ingresos.length > 0) {
          throw new BadRequestException(
            'No se puede eliminar la venta porque tiene documentos o ingresos asociados',
          );
        }

        const datosAntes = { ...venta };

        if (venta.planPago) {
          await prisma.pagoPlanPago.deleteMany({
            where: { plan_pago_id: venta.planPago.id_plan_pago },
          });

          await prisma.planPago.delete({
            where: { id_plan_pago: venta.planPago.id_plan_pago },
          });
        }

        await prisma.venta.delete({
          where: { id },
        });

        if (venta.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: venta.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_VENTA',
          'Venta',
          id,
          datosAntes,
          null,
          ip,
          userAgent,
        );

        return {
          success: true,
          message: 'Venta eliminada correctamente',
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

  async crearPagoPlan(
    ventaId: number,
    registrarPagoDto: RegistrarPagoDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const venta = await prisma.venta.findUnique({
          where: { id: ventaId },
          include: {
            planPago: {
              include: {
                pagos: true,
              },
            },
            cliente: true,
          },
        });

        if (!venta) {
          throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
        }

        if (!venta.planPago) {
          throw new BadRequestException(
            'La venta no tiene un plan de pago asociado',
          );
        }

        const planPago = venta.planPago;

        if (planPago.estado !== EstadoPlanPago.ACTIVO) {
          throw new BadRequestException(
            `El plan de pago no está activo. Estado actual: ${planPago.estado}`,
          );
        }

        const totalPagado = this.calcularTotalPagado(planPago.pagos);
        const saldoPendiente = Number(planPago.total) - totalPagado;

        if (registrarPagoDto.monto <= 0) {
          throw new BadRequestException('El monto debe ser mayor a cero');
        }

        if (registrarPagoDto.monto > saldoPendiente) {
          throw new BadRequestException(
            `El monto a pagar (Bs. ${registrarPagoDto.monto}) excede el saldo pendiente (Bs. ${saldoPendiente})`,
          );
        }

        const fechaPago = registrarPagoDto.fecha_pago || new Date();

        const pago = await prisma.pagoPlanPago.create({
          data: {
            plan_pago_id: planPago.id_plan_pago,
            monto: registrarPagoDto.monto,
            fecha_pago: fechaPago,
            observacion: registrarPagoDto.observacion || 'Pago adicional',
          },
        });

        await this.registrarMovimientoCaja(
          {
            monto: registrarPagoDto.monto,
            metodoPago: 'EFECTIVO',
            pagoId: pago.id_pago_plan,
          },
          venta,
          usuarioId,
          ip,
          userAgent,
        );

        const nuevoTotalPagado = totalPagado + Number(registrarPagoDto.monto);
        const nuevoSaldoPendiente = Number(planPago.total) - nuevoTotalPagado;

        let nuevoEstadoPlan = EstadoPlanPago.ACTIVO;
        let nuevoEstadoVenta = EstadoVenta.PENDIENTE_PAGO;

        if (nuevoSaldoPendiente <= 0) {
          nuevoEstadoPlan = EstadoPlanPago.PAGADO;
          nuevoEstadoVenta = EstadoVenta.PAGADO;
        }

        await prisma.planPago.update({
          where: { id_plan_pago: planPago.id_plan_pago },
          data: {
            estado: nuevoEstadoPlan,
            actualizado_en: new Date(),
          },
        });

        await prisma.venta.update({
          where: { id: ventaId },
          data: {
            estado: nuevoEstadoVenta,
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'CREAR_PAGO_PLAN',
          'PagoPlanPago',
          pago.id_pago_plan,
          null,
          pago,
          ip,
          userAgent,
        );

        return {
          success: true,
          message: 'Pago registrado correctamente',
          data: pago,
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

  async obtenerPagosPlan(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          planPago: {
            include: {
              pagos: {
                orderBy: {
                  fecha_pago: 'desc',
                },
              },
            },
          },
        },
      });

      if (!venta) {
        throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
      }

      if (!venta.planPago) {
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );
      }

      return {
        success: true,
        data: { pagos: venta.planPago.pagos },
      };
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

  async obtenerResumenPlanPago(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          planPago: {
            include: {
              pagos: {
                orderBy: {
                  fecha_pago: 'asc',
                },
              },
            },
          },
          cliente: {
            select: {
              id: true,
              fullName: true,
              email: true,
              telefono: true,
            },
          },
        },
      });

      if (!venta) {
        throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
      }

      if (!venta.planPago) {
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );
      }

      const planPago = venta.planPago;
      const totalPagado = this.calcularTotalPagado(planPago.pagos);
      const saldoPendiente = Math.max(0, Number(planPago.total) - totalPagado);
      const porcentajePagado =
        Number(planPago.total) > 0
          ? (totalPagado / Number(planPago.total)) * 100
          : 0;

      const hoy = new Date();
      const vencimiento = new Date(planPago.fecha_vencimiento);
      const diasRestantes = Math.ceil(
        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        success: true,
        data: {
          planPago,
          resumen: {
            total: Number(planPago.total),
            totalPagado,
            saldoPendiente,
            porcentajePagado: Number(porcentajePagado.toFixed(2)),
            cantidadPagos: planPago.pagos.length,
            estado: planPago.estado,
            montoInicial: Number(planPago.monto_inicial),
            fechaVencimiento: planPago.fecha_vencimiento,
            diasRestantes: Math.max(0, diasRestantes),
            estaCompletamentePagado: saldoPendiente <= 0,
            proximoPago: saldoPendiente > 0 ? saldoPendiente : 0,
          },
        },
      };
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

  async obtenerPlanesPagoActivos() {
    try {
      const planesPago = await this.prisma.planPago.findMany({
        where: {
          estado: EstadoPlanPago.ACTIVO,
        },
        include: {
          venta: {
            include: {
              cliente: {
                select: {
                  id: true,
                  fullName: true,
                  telefono: true,
                },
              },
              asesor: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
              lote: {
                include: {
                  urbanizacion: {
                    select: {
                      nombre: true,
                      ubicacion: true,
                    },
                  },
                },
              },
            },
          },
          pagos: {
            orderBy: {
              fecha_pago: 'desc',
            },
          },
        },
        orderBy: {
          fecha_vencimiento: 'asc',
        },
      });

      const planesConCalculos = planesPago.map((plan) => {
        const totalPagado = this.calcularTotalPagado(plan.pagos);
        const saldoPendiente = Number(plan.total) - totalPagado;

        return {
          ...plan,
          saldo_pendiente: saldoPendiente,
          total_pagado: totalPagado,
          porcentaje_pagado:
            Number(plan.total) > 0
              ? (totalPagado / Number(plan.total)) * 100
              : 0,
        };
      });

      return {
        success: true,
        data: { planesPago: planesConCalculos },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async verificarMorosidadPlanPago(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          planPago: {
            include: {
              pagos: true,
            },
          },
        },
      });

      if (!venta?.planPago) {
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );
      }

      const planPago = venta.planPago;
      const hoy = new Date();

      if (
        hoy > planPago.fecha_vencimiento &&
        planPago.estado === EstadoPlanPago.ACTIVO
      ) {
        await this.prisma.planPago.update({
          where: { id_plan_pago: planPago.id_plan_pago },
          data: { estado: EstadoPlanPago.MOROSO },
        });

        return {
          success: true,
          data: {
            estado: EstadoPlanPago.MOROSO,
            mensaje: 'El plan de pago ha sido marcado como moroso',
          },
        };
      }

      return {
        success: true,
        data: {
          estado: planPago.estado,
          mensaje: 'El plan de pago está en estado normal',
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}