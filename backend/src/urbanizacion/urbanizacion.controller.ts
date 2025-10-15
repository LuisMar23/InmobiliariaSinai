import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UrbanizacionService } from './urbanizacion.service';
import { CreateUrbanizacionDto } from './dto/create-urbanizacion.dto';
import { UpdateUrbanizacionDto } from './dto/update-urbanizacion.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

@Controller('urbanizacion')
@UseGuards(JwtAuthGuard)
export class UrbanizacionController {
  constructor(private readonly urbanizacionService: UrbanizacionService) {}

  @Get()
  async findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    return this.urbanizacionService.findAll(pageNum, size);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.urbanizacionService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUrbanizacionDto, @Request() req) {
    const userId = req.user.id;
    return this.urbanizacionService.create(
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUrbanizacionDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.urbanizacionService.update(
      id,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number,    @Request() req,) {
        const userId = req.user.id;
    return this.urbanizacionService.remove(id,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
