import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { LotesController } from 'src/lote/lote.controller';
import { LotesService } from 'src/lote/lote.service';

@Module({
  controllers: [LotesController],
  providers: [LotesService, PrismaService],
})
export class LotesModule {}
