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
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { CotizacionesService } from './cotizacion.service';

@Controller('cotizaciones')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post()
  create(@Body() createCotizacionDto: CreateCotizacionDto) {
    return this.cotizacionesService.create(createCotizacionDto);
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cotizacionesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
  ) {
    return this.cotizacionesService.update(+id, updateCotizacionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cotizacionesService.remove(+id);
  }
}
