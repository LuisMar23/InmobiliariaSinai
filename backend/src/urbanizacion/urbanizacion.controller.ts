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
import { UrbanizacionService } from './urbanizacion.service';
import { CreateUrbanizacionDto } from './dto/create-urbanizacion.dto';
import { UpdateUrbanizacionDto } from './dto/update-urbanizacion.dto';

@Controller('urbanizaciones')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UrbanizacionController {
  constructor(private readonly urbanizacionService: UrbanizacionService) {}

  @Post()
  create(@Body() createUrbanizacionDto: CreateUrbanizacionDto) {
    return this.urbanizacionService.create(createUrbanizacionDto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? +page : 1;
    const limitNum = limit ? +limit : 10;
    return this.urbanizacionService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.urbanizacionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUrbanizacionDto: UpdateUrbanizacionDto,
  ) {
    return this.urbanizacionService.update(+id, updateUrbanizacionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.urbanizacionService.remove(+id);
  }
}