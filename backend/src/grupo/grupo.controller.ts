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
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GrupoService } from './grupo.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';

@Controller('grupos')
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class GrupoController {
  constructor(private readonly grupoService: GrupoService) {}

  @Post()
  create(@Body() createGrupoDto: CreateGrupoDto, @Request() req) {
    createGrupoDto.usuarioId = req.user.id;
    return this.grupoService.create(createGrupoDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.grupoService.findAll(req.user.id, req.user.role);
  }

  @Get('publicos')
  findAllPublic() {
    return this.grupoService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grupoService.findOne(+id);
  }

  @Get('uuid/:uuid')
  findOneByUuid(@Param('uuid') uuid: string) {
    return this.grupoService.findOneByUuid(uuid);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGrupoDto: UpdateGrupoDto,
    @Request() req,
  ) {
    updateGrupoDto.usuarioId = req.user.id;
    return this.grupoService.update(+id, updateGrupoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.grupoService.remove(+id, req.user.id);
  }
}
