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
import { PrismaService } from 'src/config/prisma.service';

@Controller('lotes')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class LoteController {
  constructor(
    private readonly loteService: LoteService,
    private readonly prisma: PrismaService,
  ) {}

  // ===== RUTAS PÚBLICAS =====
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

  // ===== RUTAS PROTEGIDAS =====
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

  @Get('ciudades')
  async getCiudades() {
    const [ciudadesLotes, ciudadesUrbanizaciones] = await Promise.all([
      this.prisma.lote.findMany({
        distinct: ['ciudad'],
        select: { ciudad: true },
      }),
      this.prisma.urbanizacion.findMany({
        select: { ciudad: true, ubicacion: true },
      }),
    ]);

    const todasLasCiudades = [
      ...ciudadesLotes.map((l) => l.ciudad),
      ...ciudadesUrbanizaciones.map((u) => u.ciudad),
      ...ciudadesUrbanizaciones.map((u) => u.ubicacion),
    ];

    const ciudadesUnicas = [
      ...new Map(
        todasLasCiudades
          .filter((c) => c?.trim())
          .map((c) => [c.trim().toLowerCase(), c.trim().toUpperCase()]),
      ).values(),
    ].sort();

    return ciudadesUnicas;
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
      req.user.role,
      req.user.ciudadesAsignadas ?? [], // 👈 array en lugar de string
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
  update(
    @Param('id') id: string,
    @Body() updateLoteDto: UpdateLoteDto,
    @Request() req,
  ) {
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
    return this.loteService.asignarEncargado(+id, body.encargadoId, req.user.id);
  }
}
