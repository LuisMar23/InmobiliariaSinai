import { Injectable } from '@nestjs/common';

import { EstadoInmueble, Prisma } from '../../generated/prisma';
import { PrismaService } from 'src/config/prisma.service';
import { LoteReporteDto, ReporteLotesResponseDto, ReporteLotesDetalleResponseDto, LoteDetalleDto } from './dto/create-reporteslote.dto';

@Injectable()
export class ReportesLotesService {
  constructor(private readonly prisma: PrismaService) {}

  // Manzanos disponibles por urbanización (para el dropdown)
  async getManzanos(urbanizacionId?: number): Promise<string[]> {
    const lotes = await this.prisma.lote.findMany({
      where: {
        ...(urbanizacionId ? { urbanizacionId } : {}),
        manzano: { not: null },
      },
      select: { manzano: true },
      distinct: ['manzano'],
      orderBy: { manzano: 'asc' },
    });
    return lotes.map((l) => l.manzano!).filter(Boolean);
  }

  // Builder de where reutilizable
  private buildWhere(
    urbanizacionId?: number,
    manzano?: string,
    estado?: EstadoInmueble,
  ): Prisma.LoteWhereInput {
    return {
      ...(urbanizacionId ? { urbanizacionId } : {}),
      ...(manzano && manzano !== 'todas' ? { manzano } : {}),
      ...(estado ? { estado } : {}),
    };
  }

  // Select base reutilizable
  private get selectBase() {
    return {
      id: true,
      uuid: true,
      numeroLote: true,
      manzano: true,
      superficieM2: true,
      precioBase: true,
      ubicacion: true,
      ciudad: true,
      estado: true,
      esIndependiente: true,
      urbanizacion: {
        select: { id: true, nombre: true, ubicacion: true },
      },
    };
  }

  private mapLote(l: any): LoteReporteDto {
    return {
      id: l.id,
      uuid: l.uuid,
      numeroLote: l.numeroLote,
      manzano: l.manzano,
      superficieM2: Number(l.superficieM2),
      precioBase: Number(l.precioBase),
      ubicacion: l.ubicacion,
      ciudad: l.ciudad,
      estado: l.estado,
      esIndependiente: l.esIndependiente,
      urbanizacion: l.urbanizacion ?? null,
    };
  }

  // ─── Total de lotes ───────────────────────────────────────────────────────
  async getTotalLotes(
    urbanizacionId?: number,
    manzano?: string,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzano);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: 'asc' }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Lotes disponibles ────────────────────────────────────────────────────
  async getLotesDisponibles(
    urbanizacionId?: number,
    manzano?: string,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzano, EstadoInmueble.DISPONIBLE);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: 'asc' }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Lotes vendidos ───────────────────────────────────────────────────────
  async getLotesVendidos(
    urbanizacionId?: number,
    manzano?: string,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzano, EstadoInmueble.VENDIDO);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: 'asc' }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Lotes reservados ─────────────────────────────────────────────────────
  async getLotesReservados(
    urbanizacionId?: number,
    manzano?: string,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzano, EstadoInmueble.RESERVADO);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: 'asc' }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Detalle de lotes (con ventas, reservas, cotizaciones) ───────────────
  async getDetalleLotes(
    urbanizacionId?: number,
    manzano?: string,
  ): Promise<ReporteLotesDetalleResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzano);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: 'asc' }, { numeroLote: 'asc' }],
      select: {
        ...this.selectBase,
        encargado: { select: { fullName: true } },
        _count: {
          select: {
            ventas: true,
            reservas: true,
            cotizaciones: true,
          },
        },
      },
    });

    const data: LoteDetalleDto[] = lotes.map((l) => ({
      ...this.mapLote(l),
      totalVentas: l._count.ventas,
      totalReservas: l._count.reservas,
      totalCotizaciones: l._count.cotizaciones,
      encargado: l.encargado?.fullName ?? null,
    }));

    return {
      data,
      totalLotes: data.length,
      totalSuperficieM2: data.reduce((s, l) => s + l.superficieM2, 0),
      totalPrecioBase: data.reduce((s, l) => s + l.precioBase, 0),
      generadoEn: new Date(),
    };
  }

  // ─── Reporte general detallado (todos los estados agrupados) ─────────────
  async getGeneralDetallado(urbanizacionId?: number): Promise<{
    disponibles: ReporteLotesResponseDto;
    vendidos: ReporteLotesResponseDto;
    reservados: ReporteLotesResponseDto;
    conOferta: ReporteLotesResponseDto;
    resumen: {
      totalDisponibles: number;
      totalVendidos: number;
      totalReservados: number;
      totalConOferta: number;
      totalLotes: number;
      totalSuperficieM2: number;
      totalPrecioBase: number;
    };
    generadoEn: Date;
  }> {
    const [disponibles, vendidos, reservados, conOferta] = await Promise.all([
      this.getLotesDisponibles(urbanizacionId),
      this.getLotesVendidos(urbanizacionId),
      this.getLotesReservados(urbanizacionId),
      this.getTotalLotesPorEstado(urbanizacionId, EstadoInmueble.CON_OFERTA),
    ]);

    const todos = [
      ...disponibles.data,
      ...vendidos.data,
      ...reservados.data,
      ...conOferta.data,
    ];

    return {
      disponibles,
      vendidos,
      reservados,
      conOferta,
      resumen: {
        totalDisponibles: disponibles.totalLotes,
        totalVendidos: vendidos.totalLotes,
        totalReservados: reservados.totalLotes,
        totalConOferta: conOferta.totalLotes,
        totalLotes: todos.length,
        totalSuperficieM2: todos.reduce((s, l) => s + l.superficieM2, 0),
        totalPrecioBase: todos.reduce((s, l) => s + l.precioBase, 0),
      },
      generadoEn: new Date(),
    };
  }

  private async getTotalLotesPorEstado(
    urbanizacionId?: number,
    estado?: EstadoInmueble,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, undefined, estado);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: 'asc' }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });
    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }
}