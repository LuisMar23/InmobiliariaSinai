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
import { ContactoService } from './contacto.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Controller('contactos')
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ContactoController {
  constructor(private readonly contactoService: ContactoService) {}

  @Post()
  create(@Body() createContactoDto: CreateContactoDto, @Request() req) {
    createContactoDto.usuarioId = req.user.id;
    return this.contactoService.create(createContactoDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.contactoService.findAll(req.user.id, req.user.role);
  }

  @Get('publicos')
  findAllPublic() {
    return this.contactoService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactoService.findOne(+id);
  }

  @Get('uuid/:uuid')
  findOneByUuid(@Param('uuid') uuid: string) {
    return this.contactoService.findOneByUuid(uuid);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactoDto: UpdateContactoDto,
    @Request() req,
  ) {
    updateContactoDto.usuarioId = req.user.id;
    return this.contactoService.update(+id, updateContactoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.contactoService.remove(+id, req.user.id);
  }
}
