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
  RegistrarPagoDto,
  EstadoPlanPago,
  PeriodicidadPago,
  MetodoPago,
  UpdatePlanPagoDto,
} from './dto/create-venta.dto';
import { UpdatePagoPlanDto } from './dto/pago-plan.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditoria.create({
        data: {
          usuarioId,
          accion,
          tablaAfectada,
          registroId,
          ip: ip || '127.0.0.1',
          dispositivo: userAgent || 'API',
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
    if (!pagos || !Array.isArray(pagos)) return 0;
    return pagos.reduce(
      (sum: number, pago: any) => sum + Number(pago.monto || 0),
      0,
    );
  }

  private calcularSaldoPendiente(total: number, totalPagado: number): number {
    return Math.max(0, Number(total) - totalPagado);
  }

  private calcularPorcentajePagado(total: number, totalPagado: number): number {
    return Number(total) > 0 ? (totalPagado / Number(total)) * 100 : 0;
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

  private async registrarMovimientoCaja(
    cajaId: number,
    pagoData: any,
    venta: any,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const caja = await this.verificarCajaActiva(cajaId, prisma);
      const movimiento = await prisma.movimientoCaja.create({
        data: {
          cajaId: cajaId,
          usuarioId,
          tipo: 'INGRESO',
          monto: pagoData.monto,
          descripcion: `Pago de venta #${venta.id} - Cliente ID: ${venta.clienteId}`,
          metodoPago: pagoData.metodoPago || 'EFECTIVO',
          referencia: `Venta-${venta.id}-Pago-${pagoData.pagoId || 'Inicial'}`,
        },
      });

      const nuevoSaldo = Number(caja.saldoActual) + Number(pagoData.monto);
      await prisma.caja.update({
        where: { id: cajaId },
        data: { saldoActual: nuevoSaldo },
      });

      await this.crearAuditoria(
        usuarioId,
        'CREAR_MOVIMIENTO_CAJA',
        'MovimientoCaja',
        movimiento.id,
        ip,
        userAgent,
      );

      return movimiento;
    });
  }

  private async revertirMovimientoCaja(
    cajaId: number,
    pagoData: any,
    venta: any,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const caja = await this.verificarCajaActiva(cajaId, prisma);
      const movimiento = await prisma.movimientoCaja.create({
        data: {
          cajaId: cajaId,
          usuarioId,
          tipo: 'EGRESO',
          monto: pagoData.monto,
          descripcion: `Reversión de pago - Venta #${venta.id} - Pago ID: ${pagoData.pagoId}`,
          metodoPago: pagoData.metodoPago || 'EFECTIVO',
          referencia: `Venta-${venta.id}-Reversion-${pagoData.pagoId}`,
        },
      });

      const nuevoSaldo = Number(caja.saldoActual) - Number(pagoData.monto);
      await prisma.caja.update({
        where: { id: cajaId },
        data: { saldoActual: nuevoSaldo },
      });

      await this.crearAuditoria(
        usuarioId,
        'REVERTIR_MOVIMIENTO_CAJA',
        'MovimientoCaja',
        movimiento.id,
        ip,
        userAgent,
      );

      return movimiento;
    });
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
      const montoRestante =
        Number(venta.planPago.total) - Number(venta.planPago.monto_inicial);
      const montoCuota =
        venta.planPago.plazo > 0 ? montoRestante / venta.planPago.plazo : 0;

      venta.planPago.saldo_pendiente = isNaN(saldoPendiente)
        ? 0
        : saldoPendiente;
      venta.planPago.total_pagado = isNaN(totalPagado) ? 0 : totalPagado;
      venta.planPago.porcentaje_pagado = isNaN(porcentajePagado)
        ? 0
        : Number(porcentajePagado.toFixed(2));
      venta.planPago.monto_cuota = isNaN(montoCuota)
        ? 0
        : Number(montoCuota.toFixed(2));

      const hoy = new Date();
      const vencimiento = new Date(venta.planPago.fecha_vencimiento);
      const diasRestantes = Math.ceil(
        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
      );
      venta.planPago.dias_restantes = Math.max(0, diasRestantes);
    }

    return venta;
  }

  private async verificarPermisosUsuario(usuarioId: number, prisma: any) {
    const usuario = await prisma.user.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ForbiddenException('Usuario no encontrado');
    if (usuario.role !== 'ASESOR' && usuario.role !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo los asesores y administradores pueden realizar esta acción',
      );
    }
    return usuario;
  }

async create(
  createVentaDto: CreateVentaDto,
  asesorId: number,
  ip?: string,
  userAgent?: string,
) {
  try {
    return await this.prisma.$transaction(async (prisma) => {
      
      // ✅ Incluir SECRETARIA en los roles permitidos
      const asesor = await prisma.user.findFirst({
        where: {
          id: asesorId,
          isActive: true,
          role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
        },
      });
      if (!asesor)
        throw new ForbiddenException(
          'Solo los asesores, administradores y secretarias pueden crear ventas',
        );

      const cliente = await prisma.user.findFirst({
        where: {
          id: createVentaDto.clienteId,
          isActive: true,
          role: 'CLIENTE',
        },
      });
      if (!cliente)
        throw new BadRequestException(
          'Cliente no encontrado o no tiene rol de CLIENTE',
        );

      await this.verificarCajaActiva(createVentaDto.cajaId, prisma);

      if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {

        // ✅ Admin y Secretaria pueden vender cualquier lote disponible
        const rolesFullAccess = ['ADMINISTRADOR', 'SECRETARIA'];
        const whereClause: any = {
          id: createVentaDto.inmuebleId,
          estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
        };

        // Solo restringir por encargado si es ASESOR
        if (!rolesFullAccess.includes(asesor.role)) {
          whereClause.encargadoId = asesorId;
        }

        const lote = await prisma.lote.findFirst({
          where: whereClause,
        });

        if (!lote) {
          throw new BadRequestException(
            `El lote con ID ${createVentaDto.inmuebleId} no existe, no está disponible o no eres el encargado`,
          );
        }

      } else if (createVentaDto.inmuebleTipo === TipoInmueble.PROPIEDAD) {
        const propiedad = await prisma.propiedad.findFirst({
          where: {
            id: createVentaDto.inmuebleId,
            estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
          },
        });
        if (!propiedad) {
          throw new BadRequestException(
            `La propiedad con ID ${createVentaDto.inmuebleId} no existe o no está disponible`,
          );
        }
      }

      if (
        createVentaDto.plan_pago.monto_inicial > createVentaDto.precioFinal
      ) {
        throw new BadRequestException(
          'El monto inicial no puede ser mayor al precio final de la venta',
        );
      }

      if (
        !Object.values(PeriodicidadPago).includes(
          createVentaDto.plan_pago.periodicidad,
        )
      ) {
        throw new BadRequestException('Periodicidad de pago inválida');
      }

      const ventaData: any = {
        clienteId: createVentaDto.clienteId,
        asesorId,
        inmuebleTipo: createVentaDto.inmuebleTipo,
        precioFinal: createVentaDto.precioFinal,
        estado: createVentaDto.estado || EstadoVenta.PENDIENTE,
        observaciones: createVentaDto.observaciones || null,
        cajaId: createVentaDto.cajaId,
      };

      if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
        ventaData.loteId = createVentaDto.inmuebleId;
      } else if (createVentaDto.inmuebleTipo === TipoInmueble.PROPIEDAD) {
        ventaData.propiedadId = createVentaDto.inmuebleId;
      }

      const venta = await prisma.venta.create({
        data: ventaData,
      });

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
            metodoPago: 'EFECTIVO',
          },
        });

        await this.registrarMovimientoCaja(
          createVentaDto.cajaId,
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
          createVentaDto.plan_pago.monto_inicial >= createVentaDto.precioFinal
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

      if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
        await prisma.lote.update({
          where: { id: createVentaDto.inmuebleId },
          data: { estado: 'VENDIDO' },
        });
      } else if (createVentaDto.inmuebleTipo === TipoInmueble.PROPIEDAD) {
        await prisma.propiedad.update({
          where: { id: createVentaDto.inmuebleId },
          data: { estado: 'VENDIDO' },
        });
      }

      await this.crearAuditoria(
        asesorId,
        'CREAR_VENTA',
        'Venta',
        venta.id,
        ip,
        userAgent,
      );

      const ventaCompleta = await prisma.venta.findUnique({
        where: { id: venta.id },
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
            select: { id: true, fullName: true, email: true, telefono: true },
          },
          lote:
            createVentaDto.inmuebleTipo === TipoInmueble.LOTE
              ? { include: { urbanizacion: true } }
              : false,
          propiedad:
            createVentaDto.inmuebleTipo === TipoInmueble.PROPIEDAD
              ? true
              : false,
          planPago: { include: { pagos: true } },
          archivos: true,
          caja: {
            select: {
              id: true,
              nombre: true,
              estado: true,
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
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    console.error('Error en create venta:', error);
    throw new InternalServerErrorException('Error interno del servidor');
  }
}

  async findAll(
    clienteId?: number,
    asesorId?: number,
    page: number = 1,
    limit: number = 10,
    usuarioId?: number,
    usuarioRole?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (clienteId) where.clienteId = clienteId;
      if (asesorId) where.asesorId = asesorId;
      if (usuarioId) where.asesorId = usuarioId;

      const [ventas, total] = await Promise.all([
        this.prisma.venta.findMany({
          where,
          skip,
          take: limit,
          include: {
            cliente: {
              select: { id: true, fullName: true, ci: true, telefono: true },
            },
            asesor: {
              select: { id: true, fullName: true, email: true, telefono: true },
            },
            lote: {
              include: {
                urbanizacion: {
                  select: { id: true, nombre: true, ubicacion: true },
                },
              },
            },
            propiedad: true,
            planPago: {
              include: { pagos: { orderBy: { fecha_pago: 'desc' } } },
            },
            archivos: true,
            caja: {
              select: {
                id: true,
                nombre: true,
                estado: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
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
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error('Error en findAll ventas:', error);
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
            select: { id: true, fullName: true, email: true, telefono: true },
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
          propiedad: true,
          planPago: { include: { pagos: { orderBy: { fecha_pago: 'desc' } } } },
          archivos: true,
          caja: {
            select: {
              id: true,
              nombre: true,
              estado: true,
            },
          },
        },
      });

      if (!venta)
        throw new NotFoundException(`Venta con ID ${id} no encontrada`);

      return {
        success: true,
        data: { venta: this.agregarCalculosVenta(venta) },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en findOne venta:', error);
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
            planPago: true,
          },
        });

        if (!ventaExistente)
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);

        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        if (usuario.role === 'ASESOR' && ventaExistente.asesorId !== usuarioId)
          throw new ForbiddenException(
            'Solo puedes actualizar tus propias ventas',
          );

        if (updateVentaDto.clienteId) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateVentaDto.clienteId,
              isActive: true,
              role: 'CLIENTE',
            },
          });
          if (!cliente)
            throw new BadRequestException(
              'Cliente no encontrado o no tiene rol de CLIENTE',
            );
        }

        const updateData: any = {};
        if (updateVentaDto.clienteId !== undefined)
          updateData.clienteId = updateVentaDto.clienteId;
        if (updateVentaDto.precioFinal !== undefined) {
          updateData.precioFinal = updateVentaDto.precioFinal;
          if (ventaExistente.planPago) {
            await prisma.planPago.update({
              where: { id_plan_pago: ventaExistente.planPago.id_plan_pago },
              data: { total: updateVentaDto.precioFinal },
            });
          }
        }
        if (updateVentaDto.estado !== undefined)
          updateData.estado = updateVentaDto.estado;
        if (updateVentaDto.observaciones !== undefined)
          updateData.observaciones = updateVentaDto.observaciones;

        if (Object.keys(updateData).length === 0) {
          const ventaSinCambios = await prisma.venta.findUnique({
            where: { id },
            include: {
              cliente: true,
              asesor: true,
              lote: { include: { urbanizacion: true } },
              propiedad: true,
              planPago: { include: { pagos: true } },
              archivos: true,
              caja: {
                select: {
                  id: true,
                  nombre: true,
                  estado: true,
                },
              },
            },
          });
          
          return {
            success: true,
            message: 'No se realizaron cambios',
            data: { venta: this.agregarCalculosVenta(ventaSinCambios) },
          };
        }

        const ventaActualizada = await prisma.venta.update({
          where: { id },
          data: updateData,
          include: {
            cliente: true,
            asesor: true,
            lote: { include: { urbanizacion: true } },
            propiedad: true,
            planPago: { include: { pagos: true } },
            archivos: true,
            caja: {
              select: {
                id: true,
                nombre: true,
                estado: true,
              },
            },
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_VENTA',
          'Venta',
          id,
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
      )
        throw error;
      console.error('Error en update venta:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async actualizarMontoInicialPlanPago(
    ventaId: number,
    nuevoMontoInicial: number,
    cajaId: number,
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
                pagos: {
                  orderBy: { fecha_pago: 'asc' },
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

        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        if (usuario.role === 'ASESOR' && venta.asesorId !== usuarioId) {
          throw new ForbiddenException(
            'Solo puedes actualizar tus propias ventas',
          );
        }

        if (!venta.cajaId) {
          throw new BadRequestException('La venta no tiene una caja asociada');
        }

        await this.verificarCajaActiva(venta.cajaId, prisma);

        const montoInicialActual = Number(venta.planPago.monto_inicial);
        const diferencia = nuevoMontoInicial - montoInicialActual;

        const pagoInicialExistente = await prisma.pagoPlanPago.findFirst({
          where: {
            plan_pago_id: venta.planPago.id_plan_pago,
            observacion: 'Pago inicial',
          },
        });

        if (diferencia > 0) {
          if (pagoInicialExistente) {
            await prisma.pagoPlanPago.update({
              where: { id_pago_plan: pagoInicialExistente.id_pago_plan },
              data: { monto: nuevoMontoInicial },
            });

            await this.registrarMovimientoCaja(
              venta.cajaId,
              {
                monto: diferencia,
                metodoPago: 'EFECTIVO',
                pagoId: pagoInicialExistente.id_pago_plan,
              },
              venta,
              usuarioId,
              ip,
              userAgent,
            );
          } else {
            const nuevoPagoInicial = await prisma.pagoPlanPago.create({
              data: {
                plan_pago_id: venta.planPago.id_plan_pago,
                monto: nuevoMontoInicial,
                fecha_pago: new Date(),
                observacion: 'Pago inicial',
                metodoPago: 'EFECTIVO',
              },
            });

            await this.registrarMovimientoCaja(
              venta.cajaId,
              {
                monto: nuevoMontoInicial,
                metodoPago: 'EFECTIVO',
                pagoId: nuevoPagoInicial.id_pago_plan,
              },
              venta,
              usuarioId,
              ip,
              userAgent,
            );
          }
        } else if (diferencia < 0) {
          if (pagoInicialExistente) {
            const totalOtrosPagos = this.calcularTotalPagado(
              venta.planPago.pagos.filter(
                (p) => p.id_pago_plan !== pagoInicialExistente.id_pago_plan,
              ),
            );
            if (nuevoMontoInicial < totalOtrosPagos) {
              throw new BadRequestException(
                `El nuevo monto inicial no puede ser menor al total de pagos adicionales realizados (Bs. ${totalOtrosPagos})`,
              );
            }

            await prisma.pagoPlanPago.update({
              where: { id_pago_plan: pagoInicialExistente.id_pago_plan },
              data: { monto: nuevoMontoInicial },
            });

            await this.revertirMovimientoCaja(
              venta.cajaId,
              {
                monto: Math.abs(diferencia),
                pagoId: pagoInicialExistente.id_pago_plan,
              },
              venta,
              usuarioId,
              ip,
              userAgent,
            );
          }
        }

        await prisma.planPago.update({
          where: { id_plan_pago: venta.planPago.id_plan_pago },
          data: {
            monto_inicial: nuevoMontoInicial,
            actualizado_en: new Date(),
          },
        });

        await this.actualizarEstadoPlan(venta.planPago.id_plan_pago);

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_MONTO_INICIAL_PLAN_PAGO',
          'PlanPago',
          venta.planPago.id_plan_pago,
          ip,
          userAgent,
        );

        const ventaActualizada = await prisma.venta.findUnique({
          where: { id: ventaId },
          include: {
            planPago: {
              include: { pagos: { orderBy: { fecha_pago: 'asc' } } },
            },
          },
        });

        return {
          success: true,
          message: 'Monto inicial actualizado correctamente',
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
      console.error('Error en actualizarMontoInicialPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async remove(
    id: number,
    cajaId: number,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const venta = await prisma.venta.findUnique({
          where: { id },
          include: {
            planPago: { include: { pagos: true } },
            archivos: true,
            ingresos: true,
          },
        });

        if (!venta)
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);

        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        if (usuario.role === 'ASESOR' && venta.asesorId !== usuarioId)
          throw new ForbiddenException(
            'Solo puedes eliminar tus propias ventas',
          );

        if (venta.archivos.length > 0 || venta.ingresos.length > 0)
          throw new BadRequestException(
            'No se puede eliminar la venta porque tiene archivos o ingresos asociados',
          );

        if (!venta.cajaId) {
          throw new BadRequestException('La venta no tiene una caja asociada');
        }

        await this.verificarCajaActiva(venta.cajaId, prisma);

        if (venta.planPago && venta.planPago.pagos.length > 0) {
          const totalPagado = this.calcularTotalPagado(venta.planPago.pagos);
          if (totalPagado > 0) {
            await this.revertirMovimientoCaja(
              venta.cajaId,
              { monto: totalPagado, pagoId: 0 },
              venta,
              usuarioId,
              ip,
              userAgent,
            );
          }
          await prisma.pagoPlanPago.deleteMany({
            where: { plan_pago_id: venta.planPago.id_plan_pago },
          });
          await prisma.planPago.delete({
            where: { id_plan_pago: venta.planPago.id_plan_pago },
          });
        }

        if (venta.inmuebleTipo === TipoInmueble.LOTE && venta.loteId) {
          await prisma.lote.update({
            where: { id: venta.loteId },
            data: { estado: 'DISPONIBLE' },
          });
        } else if (
          venta.inmuebleTipo === TipoInmueble.PROPIEDAD &&
          venta.propiedadId
        ) {
          await prisma.propiedad.update({
            where: { id: venta.propiedadId },
            data: { estado: 'DISPONIBLE' },
          });
        }

        await prisma.venta.delete({ where: { id } });

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_VENTA',
          'Venta',
          id,
          ip,
          userAgent,
        );

        return { success: true, message: 'Venta eliminada correctamente' };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      console.error('Error en remove venta:', error);
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
        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        const planPago = await prisma.planPago.findUnique({
          where: { id_plan_pago: registrarPagoDto.plan_pago_id },
          include: {
            venta: {
              include: {
                cliente: true,
                asesor: true,
              },
            },
            pagos: {
              orderBy: { fecha_pago: 'asc' },
            },
          },
        });

        if (!planPago) {
          throw new NotFoundException(
            `Plan de pago con ID ${registrarPagoDto.plan_pago_id} no encontrado`,
          );
        }

        if (
          usuario.role === 'ASESOR' &&
          planPago.venta.asesorId !== usuarioId
        ) {
          throw new ForbiddenException(
            'Solo puedes registrar pagos en tus propias ventas',
          );
        }

        if (planPago.estado !== EstadoPlanPago.ACTIVO) {
          throw new BadRequestException(
            `El plan de pago no está activo. Estado actual: ${planPago.estado}`,
          );
        }

        if (!planPago.venta.cajaId) {
          throw new BadRequestException(
            'La venta no tiene una caja asociada',
          );
        }

        const cajaId = planPago.venta.cajaId;
        await this.verificarCajaActiva(cajaId, prisma);

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
        const hoy = new Date();
        const maxFechaPermitida = new Date(hoy);
        maxFechaPermitida.setDate(maxFechaPermitida.getDate() + 90);

        if (fechaPago > maxFechaPermitida) {
          throw new BadRequestException(
            'La fecha de pago no puede ser más de 90 días en el futuro',
          );
        }

        const pagoData: any = {
          plan_pago_id: registrarPagoDto.plan_pago_id,
          monto: registrarPagoDto.monto,
          fecha_pago: fechaPago,
          observacion: registrarPagoDto.observacion || null,
        };

        if (registrarPagoDto.metodoPago) {
          pagoData.metodoPago = registrarPagoDto.metodoPago;
        }

        const pago = await prisma.pagoPlanPago.create({
          data: pagoData,
        });

        await this.registrarMovimientoCaja(
          cajaId,
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

        await this.actualizarEstadoPlan(planPago.id_plan_pago);

        await this.crearAuditoria(
          usuarioId,
          'CREAR_PAGO',
          'PagoPlanPago',
          pago.id_pago_plan,
          ip,
          userAgent,
        );

        const planActualizado = await prisma.planPago.findUnique({
          where: { id_plan_pago: registrarPagoDto.plan_pago_id },
          include: {
            pagos: { orderBy: { fecha_pago: 'asc' } },
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
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error en crearPagoPlan:', error);
      throw new InternalServerErrorException(
        'Error interno del servidor al crear el pago',
      );
    }
  }

  async obtenerPago(pagoId: number) {
    try {
      const pago = await this.prisma.pagoPlanPago.findUnique({
        where: { id_pago_plan: pagoId },
        include: {
          planPago: {
            include: {
              venta: {
                include: {
                  cliente: { select: { id: true, fullName: true } },
                  asesor: { select: { id: true, fullName: true } },
                },
              },
            },
          },
        },
      });

      if (!pago)
        throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);

      return { success: true, data: { pago } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en obtenerPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerPagosPlan(planPagoId: number) {
    try {
      const planPago = await this.prisma.planPago.findUnique({
        where: { id_plan_pago: planPagoId },
        include: {
          pagos: { orderBy: { fecha_pago: 'desc' } },
          venta: {
            include: {
              cliente: {
                select: { id: true, fullName: true, ci: true, telefono: true },
              },
              asesor: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      if (!planPago)
        throw new NotFoundException(
          `Plan de pago con ID ${planPagoId} no encontrado`,
        );

      const planConCalculos = this.agregarCalculosVenta({ planPago });
      return {
        success: true,
        data: { pagos: planPago.pagos, planPago: planConCalculos.planPago },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en obtenerPagosPlan:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async actualizarPagoPlan(
    pagoId: number,
    updatePagoPlanDto: UpdatePagoPlanDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        const pagoExistente = await prisma.pagoPlanPago.findUnique({
          where: { id_pago_plan: pagoId },
          include: {
            planPago: {
              include: {
                venta: true,
                pagos: { orderBy: { fecha_pago: 'asc' } },
              },
            },
          },
        });

        if (!pagoExistente)
          throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);

        if (
          usuario.role === 'ASESOR' &&
          pagoExistente.planPago.venta.asesorId !== usuarioId
        )
          throw new ForbiddenException(
            'Solo puedes actualizar pagos de tus propias ventas',
          );

        if (pagoExistente.planPago.estado === EstadoPlanPago.PAGADO)
          throw new BadRequestException(
            'No se puede actualizar un pago de un plan ya pagado',
          );

        const montoAnterior = Number(pagoExistente.monto);
        let diferenciaMonto = 0;

        if (updatePagoPlanDto.monto !== undefined) {
          const otrosPagos = pagoExistente.planPago.pagos.filter(
            (p) => p.id_pago_plan !== pagoId,
          );
          const totalOtrosPagos = this.calcularTotalPagado(otrosPagos);
          const nuevoTotal = totalOtrosPagos + Number(updatePagoPlanDto.monto);

          if (nuevoTotal > Number(pagoExistente.planPago.total))
            throw new BadRequestException(
              `El nuevo monto excede el total del plan. Máximo permitido: ${Number(pagoExistente.planPago.total) - totalOtrosPagos}`,
            );

          diferenciaMonto = Number(updatePagoPlanDto.monto) - montoAnterior;
        }

        if (!pagoExistente.planPago.venta.cajaId) {
          throw new BadRequestException(
            'La venta no tiene una caja asociada',
          );
        }

        const cajaId = pagoExistente.planPago.venta.cajaId;

        if (diferenciaMonto !== 0) {
          await this.revertirMovimientoCaja(
            cajaId,
            { monto: montoAnterior, pagoId: pagoId },
            pagoExistente.planPago.venta,
            usuarioId,
            ip,
            userAgent,
          );
        }

        const updateData: any = {};
        if (updatePagoPlanDto.monto !== undefined)
          updateData.monto = updatePagoPlanDto.monto;
        if (updatePagoPlanDto.fecha_pago !== undefined)
          updateData.fecha_pago = updatePagoPlanDto.fecha_pago;
        if (updatePagoPlanDto.observacion !== undefined)
          updateData.observacion = updatePagoPlanDto.observacion;
        if (updatePagoPlanDto.metodoPago !== undefined)
          updateData.metodoPago = updatePagoPlanDto.metodoPago;

        const pagoActualizado = await prisma.pagoPlanPago.update({
          where: { id_pago_plan: pagoId },
          data: updateData,
        });

        if (diferenciaMonto !== 0) {
          await this.registrarMovimientoCaja(
            cajaId,
            {
              monto: Number(updatePagoPlanDto.monto),
              pagoId: pagoId,
              metodoPago: updatePagoPlanDto.metodoPago || 'EFECTIVO',
            },
            pagoExistente.planPago.venta,
            usuarioId,
            ip,
            userAgent,
          );
        }

        await this.actualizarEstadoPlan(pagoExistente.planPago.id_plan_pago);

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_PAGO',
          'PagoPlanPago',
          pagoId,
          ip,
          userAgent,
        );

        return {
          success: true,
          message: 'Pago actualizado correctamente',
          data: { pago: pagoActualizado },
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error en actualizarPagoPlan:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async eliminarPagoPlan(
    pagoId: number,
    cajaId: number,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        const pago = await prisma.pagoPlanPago.findUnique({
          where: { id_pago_plan: pagoId },
          include: {
            planPago: {
              include: {
                venta: true,
                pagos: { orderBy: { fecha_pago: 'asc' } },
              },
            },
          },
        });

        if (!pago)
          throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);

        if (
          usuario.role === 'ASESOR' &&
          pago.planPago.venta.asesorId !== usuarioId
        )
          throw new ForbiddenException(
            'Solo puedes eliminar pagos de tus propias ventas',
          );

        if (pago.planPago.estado === EstadoPlanPago.PAGADO)
          throw new BadRequestException(
            'No se puede eliminar un pago de un plan ya pagado',
          );

        if (!pago.planPago.venta.cajaId) {
          throw new BadRequestException(
            'La venta no tiene una caja asociada',
          );
        }

        const cajaOriginalId = pago.planPago.venta.cajaId;
        await this.verificarCajaActiva(cajaOriginalId, prisma);

        await this.revertirMovimientoCaja(
          cajaOriginalId,
          { monto: pago.monto, pagoId: pagoId },
          pago.planPago.venta,
          usuarioId,
          ip,
          userAgent,
        );

        await prisma.pagoPlanPago.delete({ where: { id_pago_plan: pagoId } });

        await this.actualizarEstadoPlan(pago.planPago.id_plan_pago);

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_PAGO',
          'PagoPlanPago',
          pagoId,
          ip,
          userAgent,
        );

        return { success: true, message: 'Pago eliminado correctamente' };
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en eliminarPagoPlan:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async actualizarPlanPago(
    planPagoId: number,
    updatePlanPagoDto: UpdatePlanPagoDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await this.verificarPermisosUsuario(usuarioId, prisma);

        const planPago = await prisma.planPago.findUnique({
          where: { id_plan_pago: planPagoId },
          include: { venta: true, pagos: true },
        });

        if (!planPago)
          throw new NotFoundException(
            `Plan de pago con ID ${planPagoId} no encontrado`,
          );

        if (usuario.role === 'ASESOR' && planPago.venta.asesorId !== usuarioId)
          throw new ForbiddenException(
            'Solo puedes actualizar planes de pago de tus propias ventas',
          );

        if (planPago.estado === EstadoPlanPago.PAGADO)
          throw new BadRequestException(
            'No se puede actualizar un plan de pago ya pagado',
          );

        const updateData: any = {};
        if (updatePlanPagoDto.plazo !== undefined)
          updateData.plazo = updatePlanPagoDto.plazo;
        if (updatePlanPagoDto.periodicidad !== undefined)
          updateData.periodicidad = updatePlanPagoDto.periodicidad;

        if (
          updatePlanPagoDto.plazo !== undefined ||
          updatePlanPagoDto.periodicidad !== undefined
        ) {
          const plazo =
            updatePlanPagoDto.plazo !== undefined
              ? updatePlanPagoDto.plazo
              : planPago.plazo;
          const periodicidad =
            updatePlanPagoDto.periodicidad !== undefined
              ? updatePlanPagoDto.periodicidad
              : planPago.periodicidad;

          updateData.fecha_vencimiento = this.calcularFechaVencimiento(
            planPago.fecha_inicio,
            plazo,
            periodicidad as PeriodicidadPago,
          );
        }

        const planActualizado = await prisma.planPago.update({
          where: { id_plan_pago: planPagoId },
          data: updateData,
          include: { pagos: true, venta: true },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_PLAN_PAGO',
          'PlanPago',
          planPagoId,
          ip,
          userAgent,
        );

        return {
          success: true,
          message: 'Plan de pago actualizado correctamente',
          data: {
            planPago: this.agregarCalculosVenta({ planPago: planActualizado })
              .planPago,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error en actualizarPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  private async actualizarEstadoPlan(planPagoId: number) {
    try {
      const planPago = await this.prisma.planPago.findUnique({
        where: { id_plan_pago: planPagoId },
        include: { pagos: { orderBy: { fecha_pago: 'asc' } }, venta: true },
      });

      if (!planPago) return;

      const totalPagado = this.calcularTotalPagado(planPago.pagos);
      const saldoPendiente = Number(planPago.total) - totalPagado;

      let nuevoEstadoPlan = EstadoPlanPago.ACTIVO;
      let nuevoEstadoVenta = EstadoVenta.PENDIENTE;

      if (saldoPendiente <= 0) {
        nuevoEstadoPlan = EstadoPlanPago.PAGADO;
        nuevoEstadoVenta = EstadoVenta.PAGADO;
      } else {
        const hoy = new Date();
        if (hoy > planPago.fecha_vencimiento) {
          nuevoEstadoPlan = EstadoPlanPago.MOROSO;
        }
      }

      await this.prisma.planPago.update({
        where: { id_plan_pago: planPagoId },
        data: { estado: nuevoEstadoPlan, actualizado_en: new Date() },
      });

      await this.prisma.venta.update({
        where: { id: planPago.ventaId },
        data: { estado: nuevoEstadoVenta },
      });
    } catch (error) {
      console.error('Error en actualizarEstadoPlan:', error);
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
                orderBy: { fecha_pago: 'asc' },
              },
            },
          },
          cliente: {
            select: { id: true, fullName: true, email: true, telefono: true },
          },
          asesor: { select: { id: true, fullName: true } },
          lote: {
            include: {
              urbanizacion: { select: { nombre: true, ubicacion: true } },
            },
          },
          propiedad: true,
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
            propiedad: venta.propiedad,
            observaciones: venta.observaciones,
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
            diasRestantes: planPago.dias_restantes,
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
      console.error('Error en obtenerResumenPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerPlanesPagoActivos(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [planesPago, total] = await Promise.all([
        this.prisma.planPago.findMany({
          where: { estado: EstadoPlanPago.ACTIVO },
          skip,
          take: limit,
          include: {
            venta: {
              include: {
                cliente: {
                  select: { id: true, fullName: true, telefono: true },
                },
                asesor: { select: { id: true, fullName: true } },
                lote: {
                  include: {
                    urbanizacion: { select: { nombre: true, ubicacion: true } },
                  },
                },
                propiedad: true,
              },
            },
            pagos: { orderBy: { fecha_pago: 'desc' } },
          },
          orderBy: { fecha_vencimiento: 'asc' },
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
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error('Error en obtenerPlanesPagoActivos:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async verificarMorosidadPlanPago(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: { planPago: { include: { pagos: true } } },
      });

      if (!venta?.planPago)
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );

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
      console.error('Error en verificarMorosidadPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerVentasPorCliente(clienteId: number) {
    try {
      const ventas = await this.prisma.venta.findMany({
        where: { clienteId },
        include: {
          asesor: { select: { id: true, fullName: true, telefono: true } },
          lote: {
            include: {
              urbanizacion: { select: { nombre: true, ubicacion: true } },
            },
          },
          propiedad: true,
          planPago: { include: { pagos: { orderBy: { fecha_pago: 'desc' } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const ventasConCalculos = ventas.map((venta) =>
        this.agregarCalculosVenta(venta),
      );

      return { success: true, data: { ventas: ventasConCalculos } };
    } catch (error) {
      console.error('Error en obtenerVentasPorCliente:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerCajasActivas() {
    try {
      const cajas = await this.prisma.caja.findMany({
        where: { estado: 'ABIERTA' },
        include: {
          usuarioApertura: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
      });

      return {
        success: true,
        data: { cajas },
      };
    } catch (error) {
      console.error('Error en obtenerCajasActivas:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}