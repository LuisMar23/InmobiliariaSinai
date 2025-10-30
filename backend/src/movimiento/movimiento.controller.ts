import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { AuthGuard } from '@nestjs/passport';
import { MovimientosService } from './movimiento.service';

@Controller('movimientos')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  create(@Body() dto: CreateMovimientoDto, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.movimientosService.create({ ...dto, usuarioId, ip, userAgent });
  }

  @Get('caja/:cajaId')
  findByCaja(
    @Param('cajaId') cajaId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    return this.movimientosService.findByCaja(+cajaId, pageNum, size);
  }

  @Get('caja/:cajaId/totales')
  getTotalesPorMetodo(@Param('cajaId') cajaId: string) {
    return this.movimientosService.getTotalesPorMetodo(+cajaId);
  }

  @Get('caja/:cajaId/resumen')
  getResumenCaja(@Param('cajaId') cajaId: string) {
    return this.movimientosService.getResumenCaja(+cajaId);
  }
}
