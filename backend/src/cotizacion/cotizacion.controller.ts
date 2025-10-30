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
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { CotizacionesService } from './cotizacion.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('cotizaciones')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post()
  create(@Body() createCotizacionDto: CreateCotizacionDto, @Request() req) {
    const asesorId = req.user.id;
    return this.cotizacionesService.create(createCotizacionDto, asesorId);
  }

  @Get()
  findAll(
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.cotizacionesService.findAll(
      clienteId ? +clienteId : undefined,
      estado,
    );
  }

  @Get('cliente/:clienteId')
  getCotizacionesPorCliente(@Param('clienteId') clienteId: string) {
    return this.cotizacionesService.getCotizacionesPorCliente(+clienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cotizacionesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    return this.cotizacionesService.update(+id, updateCotizacionDto, usuarioId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    return this.cotizacionesService.remove(+id, usuarioId);
  }
}
