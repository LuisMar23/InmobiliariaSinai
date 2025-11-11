import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateVentaDto,
  RegistrarPagoDto,
  UpdatePlanPagoDto,
} from './dto/create-venta.dto';
import { VentasService } from './venta.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePagoPlanDto } from './dto/pago-plan.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';

@Controller('ventas')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  create(@Body() createVentaDto: CreateVentaDto, @Request() req) {
    const asesorId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.create(createVentaDto, asesorId, ip, userAgent);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('clienteId') clienteId?: string,
    @Query('asesorId') asesorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ventasService.findAll(
      clienteId ? +clienteId : undefined,
      asesorId ? +asesorId : undefined,
      page ? +page : 1,
      limit ? +limit : 10,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVentaDto: UpdateVentaDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.update(
      +id,
      updateVentaDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    // Para eliminar, necesitamos recibir la cajaId en el body
    const { cajaId } = req.body;
    if (!cajaId) {
      throw new BadRequestException(
        'Se requiere el ID de la caja para eliminar la venta',
      );
    }
    return this.ventasService.remove(+id, cajaId, usuarioId, ip, userAgent);
  }

  @Post('pagos/registrar')
  crearPagoPlan(@Body() registrarPagoDto: RegistrarPagoDto, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.crearPagoPlan(
      registrarPagoDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Get('pagos/:pagoId')
  obtenerPago(@Param('pagoId') pagoId: string) {
    return this.ventasService.obtenerPago(+pagoId);
  }

  @Get('planes-pago/:planPagoId/pagos')
  obtenerPagosPlan(@Param('planPagoId') planPagoId: string) {
    return this.ventasService.obtenerPagosPlan(+planPagoId);
  }

  @Patch('pagos/:pagoId')
  actualizarPagoPlan(
    @Param('pagoId') pagoId: string,
    @Body() updatePagoPlanDto: UpdatePagoPlanDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.actualizarPagoPlan(
      +pagoId,
      updatePagoPlanDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Delete('pagos/:pagoId')
  eliminarPagoPlan(@Param('pagoId') pagoId: string, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    // Para eliminar pago, necesitamos recibir la cajaId en el body
    const { cajaId } = req.body;
    if (!cajaId) {
      throw new BadRequestException(
        'Se requiere el ID de la caja para eliminar el pago',
      );
    }
    return this.ventasService.eliminarPagoPlan(
      +pagoId,
      cajaId,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Patch('planes-pago/:planPagoId')
  actualizarPlanPago(
    @Param('planPagoId') planPagoId: string,
    @Body() updatePlanPagoDto: UpdatePlanPagoDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.actualizarPlanPago(
      +planPagoId,
      updatePlanPagoDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Get(':id/resumen-pago')
  obtenerResumenPlanPago(@Param('id') id: string) {
    return this.ventasService.obtenerResumenPlanPago(+id);
  }

  @Get('planes-pago/activos')
  obtenerPlanesPagoActivos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ventasService.obtenerPlanesPagoActivos(
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @Post('planes-pago/:id/verificar-morosidad')
  verificarMorosidadPlanPago(@Param('id') id: string) {
    return this.ventasService.verificarMorosidadPlanPago(+id);
  }

  @Get('clientes/mis-ventas')
  obtenerVentasCliente(@Request() req) {
    const clienteId = req.user.id;
    return this.ventasService.obtenerVentasPorCliente(clienteId);
  }

  // Nuevo endpoint para obtener cajas activas
  @Get('cajas/activas')
  obtenerCajasActivas() {
    return this.ventasService.obtenerCajasActivas();
  }
  @Patch('plan-pago/:ventaId/monto-inicial')
  actualizarMontoInicial(
    @Param('ventaId') ventaId: string,
    @Body() body: { nuevoMontoInicial: number; cajaId: number },
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.actualizarMontoInicialPlanPago(
      +ventaId,
      body.nuevoMontoInicial,
      body.cajaId,
      usuarioId,
      ip,
      userAgent,
    );
  }
}
