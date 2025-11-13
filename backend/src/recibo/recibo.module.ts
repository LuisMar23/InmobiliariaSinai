import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { ReciboService } from './recibo.service';
import { ReciboController } from './recibo.controller';

@Module({
  controllers: [ReciboController],
  providers: [ReciboService, PrismaService],
})
export class RecibosModule {}
