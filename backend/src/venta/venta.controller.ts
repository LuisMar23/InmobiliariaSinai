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
} from '@nestjs/common';
import {
  CreateVentaDto,
  RegistrarPagoDto,
  UpdateVentaDto,
} from './dto/create-venta.dto';
import { VentasService } from './venta.service';
import { AuthGuard } from '@nestjs/passport';

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
    return this.ventasService.remove(+id, usuarioId, ip, userAgent);
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

  @Get('planes-pago/:id/pagos')
  obtenerPagosPlan(@Param('id') id: string) {
    return this.ventasService.obtenerPagosPlan(+id);
  }

  @Get('clientes/mis-ventas')
  obtenerVentasCliente(@Request() req) {
    const clienteId = req.user.id;
    return this.ventasService.obtenerVentasPorCliente(clienteId);
  }
}
