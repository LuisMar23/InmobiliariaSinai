// src/propiedad/propiedad.controller.ts
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
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PropiedadService } from './propiedad.service';
import {
  CreatePropiedadDto,
  TipoPropiedad,
  EstadoPropiedad,
  EstadoInmueble,
} from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('propiedades')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class PropiedadController {
  constructor(private readonly propiedadService: PropiedadService) {}

  @Post()
  create(@Body() createPropiedadDto: CreatePropiedadDto, @Request() req) {
    createPropiedadDto.usuarioId = req.user.id;
    return this.propiedadService.create(createPropiedadDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.propiedadService.findAll(req.user.id);
  }

  @Get('para-cotizacion')
  getPropiedadesParaCotizacion() {
    return this.propiedadService.getPropiedadesParaCotizacion();
  }

  @Get('tipo/:tipo')
  getPropiedadesPorTipo(@Param('tipo') tipo: TipoPropiedad) {
    return this.propiedadService.getPropiedadesPorTipo(tipo);
  }

  @Get('estado-propiedad/:estado')
  getPropiedadesPorEstado(@Param('estado') estado: EstadoPropiedad) {
    return this.propiedadService.getPropiedadesPorEstado(estado);
  }

  @Get('estado-inmueble/:estado')
  getPropiedadesPorEstadoInmueble(@Param('estado') estado: EstadoInmueble) {
    return this.propiedadService.getPropiedadesPorEstadoInmueble(estado);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propiedadService.findOne(id);
  }

  @Get('uuid/:uuid')
  findOneUUID(@Param('uuid') uuid: string) {
    return this.propiedadService.findOneUUID(uuid);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropiedadDto: UpdatePropiedadDto,
    @Request() req,
  ) {
    updatePropiedadDto.usuarioId = req.user.id;
    return this.propiedadService.update(id, updatePropiedadDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.propiedadService.remove(id, req.user.id);
  }

  @Patch(':id/asignar-encargado')
  asignarEncargado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { encargadoId: number },
    @Request() req,
  ) {
    return this.propiedadService.asignarEncargado(
      id,
      body.encargadoId,
      req.user.id,
    );
  }
}