import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { ContactoService } from './contacto.service';
import { ContactoController } from './contacto.controller';

@Module({
  controllers: [ContactoController],
  providers: [ContactoService, PrismaService],
})
export class ContactoModule {}
