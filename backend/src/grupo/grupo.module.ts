import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { GrupoService } from './grupo.service';
import { GrupoController } from './grupo.controller';

@Module({
  controllers: [GrupoController],
  providers: [GrupoService, PrismaService],
})
export class GrupoModule {}
