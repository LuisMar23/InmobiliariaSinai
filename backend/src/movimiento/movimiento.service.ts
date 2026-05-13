import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';

@Injectable()
export class MovimientosService {
  constructor(private prisma: PrismaService) {}

  async create(payload: CreateMovimientoDto & { ip?: string; userAgent?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.user.findUnique({ where: { id: payload.usuarioId } });
      if (!usuario || !['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'].includes(usuario.role)) {
        throw new ForbiddenException('No tienes permisos para crear movimientos');
      }

      const caja = await tx.caja.findUnique({ where: { id: payload.cajaId } });
      if (!caja) throw new NotFoundException('Caja no encontrada');
      if (caja.estado === 'CERRADA') throw new BadRequestException('Caja está cerrada');

      // Si viene ventaId, verificar que existe
      if (payload.ventaId) {
        const venta = await tx.venta.findUnique({ where: { id: payload.ventaId } });
        if (!venta) throw new NotFoundException('Venta no encontrada');
      }

      const movimiento = await tx.movimientoCaja.create({
        data: {
          cajaId: payload.cajaId,
          usuarioId: payload.usuarioId,
          tipo: payload.tipo,
          monto: payload.monto,
          descripcion: payload.descripcion,
          metodoPago: payload.metodoPago || 'EFECTIVO',
          referencia: payload.referencia,
          ventaId: payload.ventaId ?? null,  // 👈 NUEVO
        },
        include: {
          usuario: {
            select: { id: true, fullName: true, username: true, role: true },
          },
          caja: {
            select: { id: true, nombre: true },
          },
          venta: {  // 👈 NUEVO
            include: {
              lote: {
                select: {
                  id: true,
                  numeroLote: true,
                  manzano: true,
                  urbanizacion: { select: { nombre: true } },
                },
              },
            },
          },
        },
      });

      const delta = payload.tipo === 'INGRESO' ? Number(payload.monto) : -Number(payload.monto);
      await tx.caja.update({
        where: { id: payload.cajaId },
        data: { saldoActual: Number(caja.saldoActual) + delta },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: payload.usuarioId,
          accion: payload.tipo,
          tablaAfectada: 'MovimientoCaja',
          registroId: movimiento.id,
          datosDespues: JSON.stringify(movimiento),
          ip: payload.ip,
          dispositivo: payload.userAgent,
        },
      });

      return movimiento;
    });
  }

  async findByCajaFiltrado(
    cajaId: number,
    page: number = 1,
    pageSize: number = 10,
    filtros?: {
      mes?: number;
      anio?: number;
      tipo?: 'INGRESO' | 'EGRESO';
      metodoPago?: string;
      manzano?: string;
      numeroLote?: string;
    },
  ) {
    const where: any = { cajaId };

    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.metodoPago) where.metodoPago = filtros.metodoPago;

    if (filtros?.mes && filtros?.anio) {
      where.fecha = {
        gte: new Date(filtros.anio, filtros.mes - 1, 1),
        lt: new Date(filtros.anio, filtros.mes, 1),
      };
    } else if (filtros?.anio) {
      where.fecha = {
        gte: new Date(filtros.anio, 0, 1),
        lt: new Date(filtros.anio + 1, 0, 1),
      };
    }

    // Filtro por lote/manzano via la venta
    if (filtros?.manzano || filtros?.numeroLote) {
      where.venta = {
        lote: {
          ...(filtros.manzano
            ? { manzano: { contains: filtros.manzano, mode: 'insensitive' } }
            : {}),
          ...(filtros.numeroLote
            ? { numeroLote: { contains: filtros.numeroLote, mode: 'insensitive' } }
            : {}),
        },
      };
    }

    const [data, total, totales] = await Promise.all([
      this.prisma.movimientoCaja.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, fullName: true, username: true, role: true },
          },
          venta: {
            include: {
              lote: {
                select: {
                  id: true,
                  numeroLote: true,
                  manzano: true,
                  urbanizacion: { select: { nombre: true } },
                },
              },
            },
          },
        },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.movimientoCaja.count({ where }),
      this.prisma.movimientoCaja.groupBy({
        by: ['tipo'],
        where,
        _sum: { monto: true },
      }),
    ]);

    const resumen = { totalIngresos: 0, totalEgresos: 0 };
    totales.forEach((t) => {
      if (t.tipo === 'INGRESO') resumen.totalIngresos = Number(t._sum.monto ?? 0);
      if (t.tipo === 'EGRESO') resumen.totalEgresos = Number(t._sum.monto ?? 0);
    });

    return { data, total, page, pageSize, resumen };
  }

  async getTotalesPorMetodo(cajaId: number) {
    const movimientos = await this.prisma.movimientoCaja.findMany({ where: { cajaId } });
    const res: Record<string, number> = {};
    movimientos.forEach((m) => {
      const key = String(m.metodoPago);
      if (!res[key]) res[key] = 0;
      res[key] += Number(m.monto) * (m.tipo === 'INGRESO' ? 1 : -1);
    });
    return res;
  }

  async getResumenCaja(cajaId: number) {
    const caja = await this.prisma.caja.findUnique({
      where: { id: cajaId },
      include: {
        movimientos: {
          where: {
            fecha: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    });

    if (!caja) throw new NotFoundException('Caja no encontrada');

    const ingresos = caja.movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const egresos = caja.movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    return {
      saldoActual: Number(caja.saldoActual),
      montoInicial: Number(caja.montoInicial),
      ingresosHoy: ingresos,
      egresosHoy: egresos,
      totalMovimientosHoy: caja.movimientos.length,
    };
  }
}
