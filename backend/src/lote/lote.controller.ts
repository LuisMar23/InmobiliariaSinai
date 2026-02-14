// src/lote/lote.controller.ts
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
import { LoteService } from './lote.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('lotes')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class LoteController {
  constructor(private readonly loteService: LoteService) {}

  @Post()
  create(@Body() createLoteDto: CreateLoteDto, @Request() req) {
    createLoteDto.usuarioId = req.user.id;
    return this.loteService.create(createLoteDto);
  }

  @Get('con-promocion')
  async obtenerLotesConPromocion() {
    return this.loteService.obtenerLotesConPromocion();
  }
  
  @Get()
  findAll(
    @Request() req,
    @Query('urbanizacionId') urbanizacionId?: string,
  ) {
    return this.loteService.findAll(
      urbanizacionId ? +urbanizacionId : undefined,
      req.user.id,
    );
  }

  @Get('para-cotizacion')
  getLotesParaCotizacion() {
    return this.loteService.getLotesParaCotizacion();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loteService.findOne(+id);
  }
  
  @Get('uuid/:id')
  findOneUUID(@Param('id') id: string) {
    return this.loteService.findOneUUID(id);
  }
  
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoteDto: UpdateLoteDto, @Request() req) {
    updateLoteDto.usuarioId = req.user.id;
    return this.loteService.update(+id, updateLoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.loteService.remove(+id, req.user.id);
  }

  @Patch(':id/asignar-encargado')
  asignarEncargado(
    @Param('id') id: string,
    @Body() body: { encargadoId: number },
    @Request() req,
  ) {
    return this.loteService.asignarEncargado(
      +id,
      body.encargadoId,
      req.user.id,
    );
  }
}