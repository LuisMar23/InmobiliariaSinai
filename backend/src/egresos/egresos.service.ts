import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateEgresoDto, FiltrosEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class EgresosService {
  constructor(private prisma: PrismaService) {}

  // ─── Crear Egreso ───────────────────────────────────────────────
  async create(dto: CreateEgresoDto, usuarioId: number) {
    const caja = await this.prisma.caja.findUnique({
      where: { id: dto.cajaId },
    });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.estado === 'CERRADA')
      throw new BadRequestException('La caja está cerrada');
    if (Number(caja.saldoActual) < Number(dto.monto))
      throw new BadRequestException('Saldo insuficiente en caja');

    return this.prisma.$transaction(async (tx) => {
      const egreso = await tx.egreso.create({
        data: {
          descripcion: dto.descripcion,
          monto:       dto.monto,
          fecha:       dto.fecha ? new Date(dto.fecha) : new Date(),
          categoriaId: dto.categoriaId,
          cajaId:      dto.cajaId,
          registradoPor: usuarioId,
        },
        include: {
          categoria: true,
          usuario:   true,
          caja:      true,
        },
      });

      await tx.movimientoCaja.create({
        data: {
          cajaId:      dto.cajaId,
          usuarioId,
          tipo:        'EGRESO',
          monto:       dto.monto,
          descripcion: dto.descripcion,
          referencia:  `EGRESO-${egreso.id}`,
          egresoId:    egreso.id,
          metodoPago:  dto.metodoPago ?? 'EFECTIVO',
        },
      });

      await tx.caja.update({
        where: { id: dto.cajaId },
        data:  { saldoActual: { decrement: dto.monto } },
      });

      return egreso;
    });
  }

  // ─── Listar Egresos ─────────────────────────────────────────────
  async findAll(filtros: FiltrosEgresoDto) {
    const where: any = {};

    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fecha = {};
      if (filtros.fechaInicio)
        where.fecha.gte = new Date(filtros.fechaInicio);
      if (filtros.fechaFin)
        where.fecha.lte = new Date(filtros.fechaFin);
    }
    if (filtros.categoriaId) where.categoriaId = Number(filtros.categoriaId);
    if (filtros.cajaId)      where.cajaId      = Number(filtros.cajaId);
    if (filtros.usuarioId)   where.registradoPor = Number(filtros.usuarioId);

    const [egresos, total] = await Promise.all([
      this.prisma.egreso.findMany({
        where,
        include: { categoria: true, usuario: true, caja: true },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.egreso.aggregate({
        where,
        _sum: { monto: true },
        _count: true,
      }),
    ]);

    return {
      resumen: {
        totalEgresos: total._count,
        montoTotal:   total._sum.monto ?? 0,
      },
      egresos,
    };
  }

  // ─── Obtener uno ────────────────────────────────────────────────
  async findOne(id: number) {
    const egreso = await this.prisma.egreso.findUnique({
      where:   { id },
      include: { categoria: true, usuario: true, caja: true, movimientosCaja: true },
    });
    if (!egreso) throw new NotFoundException('Egreso no encontrado');
    return egreso;
  }

  // ─── Editar Egreso ──────────────────────────────────────────────
  async update(id: number, dto: UpdateEgresoDto, usuarioId: number) {
    const egreso = await this.prisma.egreso.findUnique({
      where:   { id },
      include: { movimientosCaja: true },
    });
    if (!egreso) throw new NotFoundException('Egreso no encontrado');

    const montoAnterior = Number(egreso.monto);
    const montoNuevo    = dto.monto ? Number(dto.monto) : montoAnterior;
    const diferencia    = montoNuevo - montoAnterior;

    // Si cambia de caja, validar nueva caja
    const cajaId = dto.cajaId ?? egreso.cajaId;

    if (cajaId) {
      const caja = await this.prisma.caja.findUnique({ where: { id: cajaId } });
      if (!caja) throw new NotFoundException('Caja no encontrada');
      if (caja.estado === 'CERRADA')
        throw new BadRequestException('La caja está cerrada');
      if (diferencia > 0 && Number(caja.saldoActual) < diferencia)
        throw new BadRequestException('Saldo insuficiente en caja');
    }

    return this.prisma.$transaction(async (tx) => {
      // Revertir movimiento anterior en caja original
      if (egreso.cajaId && dto.monto) {
        await tx.caja.update({
          where: { id: egreso.cajaId },
          data:  { saldoActual: { increment: montoAnterior } },
        });
      }

      // Eliminar movimiento de caja anterior vinculado
      await tx.movimientoCaja.deleteMany({
        where: { egresoId: id },
      });

      // Actualizar egreso
      const egresoActualizado = await tx.egreso.update({
        where: { id },
        data: {
          ...(dto.descripcion  && { descripcion:  dto.descripcion }),
          ...(dto.monto        && { monto:         dto.monto }),
          ...(dto.fecha        && { fecha:         new Date(dto.fecha) }),
          ...(dto.categoriaId  && { categoriaId:   dto.categoriaId }),
          ...(dto.cajaId       && { cajaId:        dto.cajaId }),
        },
        include: { categoria: true, usuario: true, caja: true },
      });

      // Crear nuevo movimiento con monto actualizado
      if (cajaId) {
        await tx.movimientoCaja.create({
          data: {
            cajaId:      cajaId,
            usuarioId,
            tipo:        'EGRESO',
            monto:       montoNuevo,
            descripcion: dto.descripcion ?? egreso.descripcion,
            referencia:  `EGRESO-${id}`,
            egresoId:    id,
            metodoPago:  dto.metodoPago ?? 'EFECTIVO',
          },
        });

        // Descontar nuevo monto de caja
        await tx.caja.update({
          where: { id: cajaId },
          data:  { saldoActual: { decrement: montoNuevo } },
        });
      }

      return egresoActualizado;
    });
  }

  // ─── Eliminar Egreso ────────────────────────────────────────────
  async remove(id: number) {
    const egreso = await this.prisma.egreso.findUnique({
      where: { id },
    });
    if (!egreso) throw new NotFoundException('Egreso no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // Eliminar movimientos de caja vinculados
      await tx.movimientoCaja.deleteMany({
        where: { egresoId: id },
      });

      // Revertir saldo en caja
      if (egreso.cajaId) {
        await tx.caja.update({
          where: { id: egreso.cajaId },
          data:  { saldoActual: { increment: egreso.monto } },
        });
      }

      await tx.egreso.delete({ where: { id } });

      return { message: 'Egreso eliminado y caja actualizada correctamente' };
    });
  }

  // ─── Reporte por Categoría ──────────────────────────────────────
  // async reportePorCategoria(filtros: FiltrosEgresoDto) {
  //   const where: any = {};
  //   if (filtros.fechaInicio || filtros.fechaFin) {
  //     where.fecha = {};
  //     if (filtros.fechaInicio) where.fecha.gte = new Date(filtros.fechaInicio);
  //     if (filtros.fechaFin)    where.fecha.lte = new Date(filtros.fechaFin);
  //   }
  //   if (filtros.cajaId) where.cajaId = Number(filtros.cajaId);

  //   const egresos = await this.prisma.egreso.findMany({
  //     where,
  //     include: { categoria: true },
  //   });

  //   // Agrupar por categoría
  //   const mapa = new Map<number, any>();
  //   for (const e of egresos) {
  //     const key = e.categoriaId;
  //     if (!mapa.has(key)) {
  //       mapa.set(key, {
  //         categoria:    e.categoria,
  //         totalEgresos: 0,
  //         montoTotal:   0,
  //       });
  //     }
  //     const g = mapa.get(key);
  //     g.totalEgresos++;
  //     g.montoTotal += Number(e.monto);
  //   }

  //   const categorias = Array.from(mapa.values());
  //   const montoTotal = categorias.reduce((s, c) => s + c.montoTotal, 0);

  //   return { resumen: { montoTotal, totalCategorias: categorias.length }, categorias };
  // }

  // ─── Reporte por Caja ───────────────────────────────────────────
  async reportePorCaja(filtros: FiltrosEgresoDto) {
    const where: any = {};
    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fecha = {};
      if (filtros.fechaInicio) where.fecha.gte = new Date(filtros.fechaInicio);
      if (filtros.fechaFin)    where.fecha.lte = new Date(filtros.fechaFin);
    }

    const egresos = await this.prisma.egreso.findMany({
      where,
      include: { caja: true },
    });

    const mapa = new Map<number, any>();
    for (const e of egresos) {
      if (!e.cajaId) continue;
      if (!mapa.has(e.cajaId)) {
        mapa.set(e.cajaId, {
          caja:         e.caja,
          totalEgresos: 0,
          montoTotal:   0,
        });
      }
      const g = mapa.get(e.cajaId);
      g.totalEgresos++;
      g.montoTotal += Number(e.monto);
    }

    const cajas = Array.from(mapa.values());
    const montoTotal = cajas.reduce((s, c) => s + c.montoTotal, 0);

    return { resumen: { montoTotal, totalCajas: cajas.length }, cajas };
  }
}