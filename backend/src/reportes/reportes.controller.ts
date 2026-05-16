import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { FiltrosClienteDto, FiltrosReporteDto } from './dto/create-reporte.dto';
import { ReportesVentasService } from './reportes.service';


@UseGuards(JwtAuthGuard)

@Controller('reportes/ventas')
export class ReportesVentasController {
  constructor(private readonly reportesVentasService: ReportesVentasService) {}

  /**
   * GET /reportes/ventas/reporte
   * Resumen general + listado de ventas con filtros
   */
  @Get('reporte')
  getReporteVentas(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getReporteVentas(filtros);
  }

  /**
   * GET /reportes/ventas/detalle
   * Ventas con toda la info: plan de pago, recibos, archivos, ingresos
   */
  @Get('detalle')
  getDetalleVentas(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getDetalleVentas(filtros);
  }

  /**
   * GET /reportes/ventas/por-vendedor
   * Ventas agrupadas por asesor
   */
  @Get('por-vendedor')
  getVentasPorVendedor(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getVentasPorVendedor(filtros);
  }

  /**
   * GET /reportes/ventas/cuotas-por-cobrar
   * Planes de pago ACTIVO/MOROSO con saldo pendiente
   */
  @Get('cuotas-por-cobrar')
  getCuotasPorCobrar(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getCuotasPorCobrar(filtros);
  }

  /**
   * GET /reportes/ventas/completadas
   * Ventas con estado PAGADO
   */
  @Get('completadas')
  getVentasCompletadas(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getVentasCompletadas(filtros);
  }

  /**
   * GET /reportes/ventas/por-cliente?clienteId=1&fechaInicio=...&fechaFin=...
   * Ventas activas de un cliente específico
   */
  @Get('por-cliente')
  getVentasPorCliente(@Query() filtros: FiltrosClienteDto) {
    return this.reportesVentasService.getVentasPorCliente(filtros);
  }
}