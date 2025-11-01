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
import { CreateVisitaDto, UpdateVisitaDto } from './dto/create-visita.dto';
import { AuthGuard } from '@nestjs/passport';
import { VisitasService } from './visita.service';

@Controller('visitas')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  @Post()
  create(@Body() createVisitaDto: CreateVisitaDto, @Request() req) {
    const asesorId = req.user.id;
    return this.visitasService.create(createVisitaDto, asesorId);
  }

  @Get()
  findAll(
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.visitasService.findAll(
      clienteId ? +clienteId : undefined,
      estado,
    );
  }

  @Get('cliente/:clienteId')
  getVisitasPorCliente(@Param('clienteId') clienteId: string) {
    return this.visitasService.getVisitasPorCliente(+clienteId);
  }

  @Get('asesor/:asesorId')
  getVisitasPorAsesor(@Param('asesorId') asesorId: string) {
    return this.visitasService.getVisitasPorAsesor(+asesorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.visitasService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVisitaDto: UpdateVisitaDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    return this.visitasService.update(+id, updateVisitaDto, usuarioId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    return this.visitasService.remove(+id, usuarioId);
  }
}
