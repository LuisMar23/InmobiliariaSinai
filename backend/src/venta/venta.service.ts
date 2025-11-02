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
  MetodoPago,
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
    } catch (error) {
      console.error('Error creando auditoría:', error);
    }
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

  private calcularSaldoPendiente(total: number, totalPagado: number): number {
    return Math.max(0, Number(total) - totalPagado);
  }

  private calcularPorcentajePagado(total: number, totalPagado: number): number {
    return Number(total) > 0 ? (totalPagado / Number(total)) * 100 : 0;
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

    if (
      !usuario ||
      !['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'].includes(usuario.role)
    ) {
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

  private async verificarDisponibilidadInmueble(
    tipoInmueble: TipoInmueble,
    inmuebleId: number,
    prisma: any,
  ): Promise<void> {
    if (tipoInmueble === TipoInmueble.LOTE) {
      const lote = await prisma.lote.findUnique({
        where: { id: inmuebleId },
      });

      if (!lote) {
        throw new NotFoundException(`Lote con ID ${inmuebleId} no encontrado`);
      }

      if (lote.estado !== 'DISPONIBLE' && lote.estado !== 'CON_OFERTA') {
        throw new BadRequestException(
          `El lote no está disponible para venta. Estado actual: ${lote.estado}`,
        );
      }
    }
  }

  private agregarCalculosVenta(venta: any) {
    if (!venta) return venta;

    if (venta.planPago) {
      const totalPagado = this.calcularTotalPagado(venta.planPago.pagos || []);
      const saldoPendiente = this.calcularSaldoPendiente(
        Number(venta.planPago.total),
        totalPagado,
      );
      const porcentajePagado = this.calcularPorcentajePagado(
        Number(venta.planPago.total),
        totalPagado,
      );

      venta.planPago.saldo_pendiente = saldoPendiente;
      venta.planPago.total_pagado = totalPagado;
      venta.planPago.porcentaje_pagado = Number(porcentajePagado.toFixed(2));

      const montoRestante =
        Number(venta.planPago.total) - Number(venta.planPago.monto_inicial);
      const montoCuota = montoRestante / venta.planPago.plazo;
      venta.planPago.monto_cuota = Number(montoCuota.toFixed(2));
    }

    return venta;
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
            role: { in: ['ASESOR', 'ADMINISTRADOR'] },
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

        await this.verificarDisponibilidadInmueble(
          createVentaDto.inmuebleTipo,
          createVentaDto.inmuebleId,
          prisma,
        );

        if (createVentaDto.plan_pago) {
          this.validarPlanPago(
            createVentaDto.plan_pago,
            createVentaDto.precioFinal,
          );
        }

        // Crear la venta
        const ventaData: any = {
          clienteId: createVentaDto.clienteId,
          asesorId: asesorId,
          inmuebleTipo: createVentaDto.inmuebleTipo,
          inmuebleId: createVentaDto.inmuebleId,
          precioFinal: createVentaDto.precioFinal,
          estado: createVentaDto.estado || EstadoVenta.PENDIENTE,
        };

        const venta = await prisma.venta.create({
          data: ventaData,
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
            const pagoInicial = await prisma.pagoPlanPago.create({
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
                pagoId: pagoInicial.id_pago_plan,
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
      console.error('Error creating sale:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findAll(
    clienteId?: number,
    asesorId?: number,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (clienteId) where.clienteId = clienteId;
      if (asesorId) where.asesorId = asesorId;

      const [ventas, total] = await Promise.all([
        this.prisma.venta.findMany({
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
          skip,
          take: limit,
        }),
        this.prisma.venta.count({ where }),
      ]);

      const ventasConCalculos = ventas.map((venta) =>
        this.agregarCalculosVenta(venta),
      );

      return {
        success: true,
        data: {
          ventas: ventasConCalculos,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error finding sales:', error);
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
      console.error('Error finding sale:', error);
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
          include: {
            planPago: {
              include: {
                pagos: true,
              },
            },
          },
        });

        if (!ventaExistente) {
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);
        }

        const datosAntes = { ...ventaExistente };

        // Verificar permisos del usuario
        const usuario = await prisma.user.findUnique({
          where: { id: usuarioId },
        });

        if (!usuario || !['ADMINISTRADOR', 'ASESOR'].includes(usuario.role)) {
          throw new ForbiddenException(
            'No tienes permisos para actualizar ventas',
          );
        }

        // Si el asesor no es administrador, solo puede actualizar sus propias ventas
        if (
          usuario.role === 'ASESOR' &&
          ventaExistente.asesorId !== usuarioId
        ) {
          throw new ForbiddenException(
            'Solo puedes actualizar tus propias ventas',
          );
        }

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

        const updateData: any = {};
        if (updateVentaDto.clienteId !== undefined) {
          updateData.clienteId = updateVentaDto.clienteId;
        }
        if (updateVentaDto.inmuebleTipo !== undefined) {
          updateData.inmuebleTipo = updateVentaDto.inmuebleTipo;
        }
        if (updateVentaDto.inmuebleId !== undefined) {
          updateData.inmuebleId = updateVentaDto.inmuebleId;
        }
        if (updateVentaDto.precioFinal !== undefined) {
          updateData.precioFinal = updateVentaDto.precioFinal;
        }
        if (updateVentaDto.estado !== undefined) {
          updateData.estado = updateVentaDto.estado as any; // Cast para resolver el error de tipo
        }

        const ventaActualizada = await prisma.venta.update({
          where: { id },
          data: updateData,
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
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error updating sale:', error);
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
            archivos: true,
            ingresos: true,
          },
        });

        if (!venta) {
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);
        }

        // Verificar permisos
        const usuario = await prisma.user.findUnique({
          where: { id: usuarioId },
        });

        if (!usuario || !['ADMINISTRADOR'].includes(usuario.role)) {
          throw new ForbiddenException(
            'Solo los administradores pueden eliminar ventas',
          );
        }

        if (venta.archivos.length > 0 || venta.ingresos.length > 0) {
          throw new BadRequestException(
            'No se puede eliminar la venta porque tiene documentos o ingresos asociados',
          );
        }

        const datosAntes = { ...venta };

        // Revertir pagos en caja si existen
        if (venta.planPago && venta.planPago.pagos.length > 0) {
          const totalPagado = this.calcularTotalPagado(venta.planPago.pagos);
          if (totalPagado > 0) {
            // Registrar movimiento de egreso en caja por los pagos realizados
            const caja = await prisma.caja.findFirst({
              where: { estado: 'ABIERTA' },
            });

            if (caja) {
              await prisma.movimientoCaja.create({
                data: {
                  cajaId: caja.id,
                  usuarioId: usuarioId,
                  tipo: 'EGRESO',
                  monto: totalPagado,
                  descripcion: `Reversión por eliminación de venta #${venta.id}`,
                  metodoPago: 'EFECTIVO',
                  referencia: `Venta-${venta.id}-Eliminacion`,
                },
              });

              // Actualizar saldo de caja
              const nuevoSaldo = Number(caja.saldoActual) - totalPagado;
              await prisma.caja.update({
                where: { id: caja.id },
                data: { saldoActual: nuevoSaldo },
              });
            }
          }

          // Eliminar pagos del plan
          await prisma.pagoPlanPago.deleteMany({
            where: { plan_pago_id: venta.planPago.id_plan_pago },
          });

          // Eliminar plan de pago
          await prisma.planPago.delete({
            where: { id_plan_pago: venta.planPago.id_plan_pago },
          });
        }

        // Revertir estado del inmueble
        if (venta.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: venta.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }

        // Finalmente eliminar la venta
        await prisma.venta.delete({
          where: { id },
        });

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
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error removing sale:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async crearPagoPlan(
    registrarPagoDto: RegistrarPagoDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const planPago = await prisma.planPago.findUnique({
          where: { id_plan_pago: registrarPagoDto.plan_pago_id },
          include: {
            venta: {
              include: {
                cliente: true,
                asesor: true,
              },
            },
            pagos: true,
          },
        });

        if (!planPago) {
          throw new NotFoundException(
            `Plan de pago con ID ${registrarPagoDto.plan_pago_id} no encontrado`,
          );
        }

        if (planPago.estado !== EstadoPlanPago.ACTIVO) {
          throw new BadRequestException(
            `El plan de pago no está activo. Estado actual: ${planPago.estado}`,
          );
        }

        const totalPagado = this.calcularTotalPagado(planPago.pagos);
        const saldoPendiente = this.calcularSaldoPendiente(
          Number(planPago.total),
          totalPagado,
        );

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
            plan_pago_id: registrarPagoDto.plan_pago_id,
            monto: registrarPagoDto.monto,
            fecha_pago: fechaPago,
            observacion: registrarPagoDto.observacion || 'Pago adicional',
          },
        });

        await this.registrarMovimientoCaja(
          {
            monto: registrarPagoDto.monto,
            metodoPago: registrarPagoDto.metodoPago || 'EFECTIVO',
            pagoId: pago.id_pago_plan,
          },
          planPago.venta,
          usuarioId,
          ip,
          userAgent,
        );

        const nuevoTotalPagado = totalPagado + Number(registrarPagoDto.monto);
        const nuevoSaldoPendiente = this.calcularSaldoPendiente(
          Number(planPago.total),
          nuevoTotalPagado,
        );

        let nuevoEstadoPlan = EstadoPlanPago.ACTIVO;
        let nuevoEstadoVenta = EstadoVenta.PENDIENTE;

        if (nuevoSaldoPendiente <= 0) {
          nuevoEstadoPlan = EstadoPlanPago.PAGADO;
          nuevoEstadoVenta = EstadoVenta.PAGADO;
        }

        await prisma.planPago.update({
          where: { id_plan_pago: registrarPagoDto.plan_pago_id },
          data: {
            estado: nuevoEstadoPlan,
            actualizado_en: new Date(),
          },
        });

        await prisma.venta.update({
          where: { id: planPago.ventaId },
          data: {
            estado: nuevoEstadoVenta as any, // Cast para resolver el error de tipo
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

        // Obtener el plan actualizado con cálculos
        const planActualizado = await prisma.planPago.findUnique({
          where: { id_plan_pago: registrarPagoDto.plan_pago_id },
          include: {
            pagos: true,
            venta: true,
          },
        });

        return {
          success: true,
          message: 'Pago registrado correctamente',
          data: {
            pago,
            planPago: this.agregarCalculosVenta({ planPago: planActualizado })
              .planPago,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error creating payment:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerPagosPlan(planPagoId: number) {
    try {
      const planPago = await this.prisma.planPago.findUnique({
        where: { id_plan_pago: planPagoId },
        include: {
          pagos: {
            orderBy: {
              fecha_pago: 'desc',
            },
          },
          venta: {
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
                },
              },
            },
          },
        },
      });

      if (!planPago) {
        throw new NotFoundException(
          `Plan de pago con ID ${planPagoId} no encontrado`,
        );
      }

      const planConCalculos = this.agregarCalculosVenta({ planPago });

      return {
        success: true,
        data: {
          pagos: planPago.pagos,
          planPago: planConCalculos.planPago,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting payments:', error);
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
      });

      if (!venta) {
        throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
      }

      if (!venta.planPago) {
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );
      }

      const ventaConCalculos = this.agregarCalculosVenta(venta);
      const planPago = ventaConCalculos.planPago;

      const hoy = new Date();
      const vencimiento = new Date(planPago.fecha_vencimiento);
      const diasRestantes = Math.ceil(
        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        success: true,
        data: {
          venta: {
            id: venta.id,
            precioFinal: venta.precioFinal,
            estado: venta.estado,
            cliente: venta.cliente,
            asesor: venta.asesor,
            lote: venta.lote,
          },
          planPago,
          resumen: {
            total: Number(planPago.total),
            totalPagado: planPago.total_pagado,
            saldoPendiente: planPago.saldo_pendiente,
            porcentajePagado: planPago.porcentaje_pagado,
            cantidadPagos: planPago.pagos.length,
            estado: planPago.estado,
            montoInicial: Number(planPago.monto_inicial),
            fechaVencimiento: planPago.fecha_vencimiento,
            diasRestantes: Math.max(0, diasRestantes),
            estaCompletamentePagado: planPago.saldo_pendiente <= 0,
            proximoPago:
              planPago.saldo_pendiente > 0 ? planPago.monto_cuota : 0,
            montoCuota: planPago.monto_cuota,
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
      console.error('Error getting payment summary:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerPlanesPagoActivos(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [planesPago, total] = await Promise.all([
        this.prisma.planPago.findMany({
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
          skip,
          take: limit,
        }),
        this.prisma.planPago.count({
          where: { estado: EstadoPlanPago.ACTIVO },
        }),
      ]);

      const planesConCalculos = planesPago.map((plan) => {
        const ventaConCalculos = this.agregarCalculosVenta({ planPago: plan });
        return ventaConCalculos.planPago;
      });

      return {
        success: true,
        data: {
          planesPago: planesConCalculos,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error getting active payment plans:', error);
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
      console.error('Error checking delinquency:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerVentasPorCliente(clienteId: number) {
    try {
      const ventas = await this.prisma.venta.findMany({
        where: { clienteId },
        include: {
          asesor: {
            select: {
              id: true,
              fullName: true,
              telefono: true,
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
      console.error('Error getting client sales:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
