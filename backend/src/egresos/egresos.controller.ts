import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EgresosService } from './egresos.service';
import { CreateEgresoDto, FiltrosEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('egresos')
export class EgresosController {
  constructor(private readonly egresosService: EgresosService) {}

  // POST /egresos
  @Post()
  create(@Body() dto: CreateEgresoDto, @Req() req: any) {
    return this.egresosService.create(dto, req.user.id);
  }

  // GET /egresos
  @Get()
  findAll(@Query() filtros: FiltrosEgresoDto) {
    return this.egresosService.findAll(filtros);
  }

  // GET /egresos/reporte/categorias
  // @Get('reporte/categorias')
  // reportePorCategoria(@Query() filtros: FiltrosEgresoDto) {
  //   return this.egresosService.reportePorCategoria(filtros);
  // }

  // GET /egresos/reporte/cajas
  @Get('reporte/cajas')
  reportePorCaja(@Query() filtros: FiltrosEgresoDto) {
    return this.egresosService.reportePorCaja(filtros);
  }

  // GET /egresos/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.egresosService.findOne(id);
  }

  // PUT /egresos/:id
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEgresoDto,
    @Req() req: any,
  ) {
    return this.egresosService.update(id, dto, req.user.id);
  }

  // DELETE /egresos/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.egresosService.remove(id);
  }
}