// src/cotizacion/cotizacion.controller.ts (sin cambios)
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
import { CotizacionService } from './cotizacion.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('cotizaciones')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class CotizacionController {
  constructor(private readonly cotizacionService: CotizacionService) {}

  @Post()
  create(@Body() createCotizacionDto: CreateCotizacionDto, @Request() req) {
    const asesorId = req.user.id;
    return this.cotizacionService.create(createCotizacionDto, asesorId);
  }

  @Get()
  findAll(
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.cotizacionService.findAll(
      clienteId ? +clienteId : undefined,
      estado,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cotizacionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    return this.cotizacionService.update(+id, updateCotizacionDto, usuarioId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    return this.cotizacionService.remove(+id, usuarioId);
  }
}
