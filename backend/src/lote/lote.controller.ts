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
export class LoteController {
  constructor(private readonly loteService: LoteService) {}

  // ===== RUTAS PÚBLICAS (sin autenticación) =====
  @Get('publicos/todos')
  async findAllPublicos() {
    return this.loteService.findAllPublicos();
  }

  @Get('publicos/uuid/:id')
  async findOneUUIDPublic(@Param('id') id: string) {
    return this.loteService.findOneUUID(id);
  }

  @Get('publicos/con-promocion')
  async obtenerLotesConPromocionPublic() {
    return this.loteService.obtenerLotesConPromocion();
  }

  // ===== RUTAS PROTEGIDAS (requieren autenticación) =====
  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createLoteDto: CreateLoteDto, @Request() req) {
    createLoteDto.usuarioId = req.user.id;
    return this.loteService.create(createLoteDto);
  }

  @Get('con-promocion')
  @UseGuards(AuthGuard('jwt'))
  async obtenerLotesConPromocion() {
    return this.loteService.obtenerLotesConPromocion();
  }
  
  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Request() req,
    @Query('urbanizacionId') urbanizacionId?: string,
  ) {
    return this.loteService.findAll(
      urbanizacionId ? +urbanizacionId : undefined,
      req.user.id,
    );
  }

  @Get('independientes/todos')
  @UseGuards(AuthGuard('jwt'))
  findAllIndependientes() {
    return this.loteService.findAllIndependientes();
  }

  @Get('para-cotizacion')
  @UseGuards(AuthGuard('jwt'))
  getLotesParaCotizacion() {
    return this.loteService.getLotesParaCotizacion();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.loteService.findOne(+id);
  }
  
  @Get('uuid/:id')
  @UseGuards(AuthGuard('jwt'))
  findOneUUID(@Param('id') id: string) {
    return this.loteService.findOneUUID(id);
  }
  
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateLoteDto: UpdateLoteDto, @Request() req) {
    updateLoteDto.usuarioId = req.user.id;
    return this.loteService.update(+id, updateLoteDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @Request() req) {
    return this.loteService.remove(+id, req.user.id);
  }

  @Patch(':id/asignar-encargado')
  @UseGuards(AuthGuard('jwt'))
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