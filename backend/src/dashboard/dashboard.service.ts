import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';


@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getResumenGeneral() {
    const [lotesDisponibles, lotesVendidos, lotesReservados, ingresosTotales, ingresosMes, topAsesores, urbanizacionPopular] =
      await Promise.all([
        this.prisma.lote.count({ where: { estado: 'DISPONIBLE' } }),
        this.prisma.lote.count({ where: { estado: 'VENDIDO' } }),
        this.prisma.lote.count({ where: { estado: 'RESERVADO' } }),
        this.prisma.venta.aggregate({ _sum: { precioFinal: true } }),
        this.prisma.venta.aggregate({
          _sum: { precioFinal: true },
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        this.prisma.venta.groupBy({
          by: ['asesorId'],
          _count: { id: true },
          _sum: { precioFinal: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        }),
        this.prisma.venta.groupBy({
          by: ['inmuebleId'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
        }),
      ]);

    const urbanizacionData = await this.prisma.urbanizacion.findFirst({
      where: { lotes: { some: { id: urbanizacionPopular[0]?.inmuebleId } } },
      select: { nombre: true },
    });

    return {
      lotes: {
        disponibles: lotesDisponibles,
        vendidos: lotesVendidos,
        reservados: lotesReservados,
      },
      ingresos: {
        total: ingresosTotales._sum.precioFinal || 0,
        mes: ingresosMes._sum.precioFinal || 0,
      },
      asesores: topAsesores,
      urbanizacionMasDemandada: urbanizacionData?.nombre || 'N/D',
    };
  }

  async getActividadMensual() {
    const ventas = await this.prisma.$queryRaw<
      { mes: number; total: number }[]
    >`
      SELECT EXTRACT(MONTH FROM "created_at") AS mes, COUNT(*) AS total
      FROM "Venta"
      GROUP BY mes
      ORDER BY mes;
    `;

    const reservas = await this.prisma.$queryRaw<
      { mes: number; total: number }[]
    >`
      SELECT EXTRACT(MONTH FROM "fecha_inicio") AS mes, COUNT(*) AS total
      FROM "Reserva"
      GROUP BY mes
      ORDER BY mes;
    `;

    const cotizaciones = await this.prisma.$queryRaw<
      { mes: number; total: number }[]
    >`
      SELECT EXTRACT(MONTH FROM "created_at") AS mes, COUNT(*) AS total
      FROM "Cotizacion"
      GROUP BY mes
      ORDER BY mes;
    `;

    return { ventas, reservas, cotizaciones };
  }
}
