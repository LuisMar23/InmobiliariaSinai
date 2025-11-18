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
} from '@nestjs/common';
import { LoteService } from './lote.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';

@Controller('lotes')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class LoteController {
  constructor(private readonly loteService: LoteService) {}

  @Post()
  create(@Body() createLoteDto: CreateLoteDto) {
    return this.loteService.create(createLoteDto);
  }

  @Get('con-promocion')
  async obtenerLotesConPromocion() {
    return this.loteService.obtenerLotesConPromocion();
  }
  @Get()
  findAll(@Query('urbanizacionId') urbanizacionId?: string) {
    return this.loteService.findAll(
      urbanizacionId ? +urbanizacionId : undefined,
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
  update(@Param('id') id: string, @Body() updateLoteDto: UpdateLoteDto) {
    return this.loteService.update(+id, updateLoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loteService.remove(+id);
  }

}
